/**
 * Firebase Cache Service
 *
 * Provides server-side caching using Firestore Admin SDK.
 *
 * CROSS-USER CACHING:
 * Cache is shared across ALL users. The cache key is based on:
 * - Normalized query (e.g., "gitlab", "https://gitlab.com" -> "gitlab")
 * - Language code (e.g., "en", "fr")
 *
 * This means:
 * - If User 1 asks for "gitlab" in English, the response is cached
 * - If User 2 asks for "gitlab" in English, they get the cached response (no Gemini API call)
 * - Different languages create separate cache entries (e.g., "gitlab" in French vs English)
 *
 * Uses two collections:
 * - cachedResponses: Contains all cached responses (shared across users)
 * - users: Maps users to cached responses they've accessed (for analytics only)
 *
 * Uses Admin SDK which bypasses security rules - perfect for server-side operations.
 */

import { getAdminDb } from "@/app/lib/firebaseAdmin";
import { createHash } from "crypto";
import { Timestamp } from "firebase-admin/firestore";

interface CachedResponse {
  normalizedQuery: string;
  query: string;
  language: string;
  response: string;
  timestamp: Timestamp | Date;
  model: string;
}

interface UserCache {
  userId: string;
  cachedResponseIds: string[];
  lastUpdated: Timestamp | Date;
}

const CACHED_RESPONSES_COLLECTION = "cachedResponses";
const USERS_COLLECTION = "users";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

class FirebaseCacheService {
  /**
   * Normalize a query to improve cache hits
   * Extracts key terms from product names, URLs, etc.
   */
  private normalizeQuery(query: string): string {
    let normalized = query.toLowerCase().trim();

    // Extract domain from URLs
    try {
      const url = new URL(normalized.startsWith("http") ? normalized : `https://${normalized}`);
      normalized = url.hostname.replace("www.", "");
    } catch {
      // Not a URL, continue with normalization
    }

    // Remove common prefixes/suffixes
    normalized = normalized
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return normalized;
  }

  /**
   * Generate a cache key (document ID) from normalized query and language
   */
  private getCacheKey(normalizedQuery: string, language: string): string {
    const keyString = `${normalizedQuery}:${language}`;
    // Use SHA-256 hash to create a consistent document ID
    return createHash("sha256").update(keyString).digest("hex");
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(timestamp: Timestamp | Date | any): boolean {
    if (!timestamp) return true;
    let entryTime: number;
    if (timestamp instanceof Timestamp) {
      entryTime = timestamp.toMillis();
    } else if (timestamp.toMillis) {
      entryTime = timestamp.toMillis();
    } else if (timestamp instanceof Date) {
      entryTime = timestamp.getTime();
    } else {
      entryTime = new Date(timestamp).getTime();
    }
    const now = Date.now();
    return now - entryTime > MAX_AGE;
  }

  /**
   * Get cached response if available and not expired
   *
   * IMPORTANT: Cache is shared across ALL users. The cache key is based on:
   * - Normalized query (e.g., "gitlab" -> "gitlab")
   * - Language code (e.g., "en", "fr")
   *
   * This means if User 1 asks for "gitlab" in English and it gets cached,
   * User 2 asking for "gitlab" in English will get the same cached response
   * without making a new request to Gemini.
   *
   * @param query - The user's query
   * @param language - Language code (default: "en")
   * @param userId - Optional user ID to track usage (does NOT affect cache lookup)
   * @returns Cached response or null
   */
  async get(
    query: string,
    language: string = "en",
    userId?: string
  ): Promise<string | null> {
    try {
      // Normalize language to ensure consistency
      const normalizedLanguage = (language || "en").toLowerCase().trim();

      const db = getAdminDb();

      const normalizedQuery = this.normalizeQuery(query);
      // Cache key is based ONLY on normalized query + language, NOT userId
      // This ensures cache is shared across all users
      const cacheKey = this.getCacheKey(normalizedQuery, normalizedLanguage);

      // Get cached response using Admin SDK (shared across all users)
      const cachedResponseRef = db.collection(CACHED_RESPONSES_COLLECTION).doc(cacheKey);

      const cachedResponseSnap = await cachedResponseRef.get();

      if (!cachedResponseSnap.exists) {
        return null;
      }

      const cachedData = cachedResponseSnap.data() as CachedResponse;
      const cachedLanguageNormalized = (cachedData.language || "en").toLowerCase().trim();

      // CRITICAL: Verify the cached entry's language matches the requested language
      // This prevents returning a cached response from a different language
      if (cachedLanguageNormalized !== normalizedLanguage) {
        return null;
      }

      // Check if expired
      if (this.isExpired(cachedData.timestamp)) {
        return null;
      }

      // Track user access if userId is provided (for analytics, not filtering)
      if (userId) {
        try {
          await this.trackUserAccess(userId, cacheKey);
        } catch (trackError) {
          // Don't fail if tracking fails
        }
      }

      // Cache hit - this response is shared across all users with same query + language
      return cachedData.response;
    } catch (error) {
      console.error("[Firebase Cache] Error getting cached response:", error);
      // Return null on error so the request can proceed without cache
      return null;
    }
  }

  /**
   * Store response in cache
   *
   * IMPORTANT: Cached responses are shared across ALL users. When a response is cached,
   * it becomes available to all users who ask for the same query in the same language.
   *
   * @param query - The user's query
   * @param response - The response to cache (will be shared with all users)
   * @param model - Model name (default: "gemini-2.5-pro")
   * @param language - Language code (default: "en")
   * @param userId - Optional user ID to track usage (does NOT affect cache storage)
   */
  async set(
    query: string,
    response: string,
    model: string = "gemini-2.5-pro",
    language: string = "en",
    userId?: string
  ): Promise<void> {
    try {
      // Normalize language to ensure consistency
      const normalizedLanguage = (language || "en").toLowerCase().trim();

      const db = getAdminDb();

      const normalizedQuery = this.normalizeQuery(query);
      // Cache key is based ONLY on normalized query + language, NOT userId
      // This ensures cache is shared across all users
      const cacheKey = this.getCacheKey(normalizedQuery, normalizedLanguage);

      // Store or update cached response using Admin SDK (shared across all users)
      const cachedResponseRef = db.collection(CACHED_RESPONSES_COLLECTION).doc(cacheKey);

      const cacheData = {
        normalizedQuery,
        query: query.trim(),
        language: normalizedLanguage, // Store normalized language
        response,
        timestamp: Timestamp.now(),
        model,
      };

      await cachedResponseRef.set(cacheData, { merge: true });

      // Track user access if userId is provided (for analytics, not filtering)
      if (userId) {
        try {
          await this.trackUserAccess(userId, cacheKey);
        } catch (trackError) {
          // Don't fail if tracking fails
        }
      }
    } catch (error) {
      console.error("[Firebase Cache] Error caching response:", error);
      // Re-throw the error so the caller knows caching failed
      // This helps with debugging and ensures we know when caching isn't working
      throw error;
    }
  }

  /**
   * Track that a user has accessed a cached response
   * @param userId - User ID
   * @param cachedResponseId - Cached response document ID
   */
  private async trackUserAccess(userId: string, cachedResponseId: string): Promise<void> {
    try {
      const db = getAdminDb();
      const userRef = db.collection(USERS_COLLECTION).doc(userId);
      const userSnap = await userRef.get();

      if (userSnap.exists) {
        const userData = userSnap.data() as UserCache;
        // Add cachedResponseId if not already present
        if (!userData.cachedResponseIds?.includes(cachedResponseId)) {
          await userRef.update({
            cachedResponseIds: [...(userData.cachedResponseIds || []), cachedResponseId],
            lastUpdated: Timestamp.now(),
          });
        }
      } else {
        // Create new user document
        await userRef.set({
          userId,
          cachedResponseIds: [cachedResponseId],
          lastUpdated: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error("Error tracking user access:", error);
      // Don't throw - tracking failures shouldn't break the app
    }
  }

  /**
   * Clear expired entries from cache
   */
  async clearExpired(): Promise<void> {
    try {
      const db = getAdminDb();
      const cachedResponsesRef = db.collection(CACHED_RESPONSES_COLLECTION);
      const snapshot = await cachedResponsesRef.get();
      let clearedCount = 0;

      let currentBatch = db.batch();
      let batchCount = 0;
      const BATCH_SIZE = 500; // Firestore batch limit

      const expiredDocs: FirebaseFirestore.DocumentReference[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CachedResponse;
        if (this.isExpired(data.timestamp)) {
          expiredDocs.push(docSnap.ref);
        }
      });

      // Process deletions in batches
      for (const docRef of expiredDocs) {
        currentBatch.delete(docRef);
        batchCount++;
        clearedCount++;

        // Commit batch if it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await currentBatch.commit();
          currentBatch = db.batch();
          batchCount = 0;
        }
      }

      // Commit remaining batch
      if (batchCount > 0) {
        await currentBatch.commit();
      }

      if (clearedCount > 0) {
        console.log(`Cleared ${clearedCount} expired cache entries`);
      }
    } catch (error) {
      console.error("Error clearing expired cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ total: number; expired: number; valid: number }> {
    try {
      const db = getAdminDb();
      const cachedResponsesRef = db.collection(CACHED_RESPONSES_COLLECTION);
      const snapshot = await cachedResponsesRef.get();
      let expired = 0;
      let valid = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CachedResponse;
        if (this.isExpired(data.timestamp)) {
          expired++;
        } else {
          valid++;
        }
      });

      return {
        total: snapshot.size,
        expired,
        valid,
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return { total: 0, expired: 0, valid: 0 };
    }
  }
}

// Export singleton instance
export const firebaseCacheService = new FirebaseCacheService();

