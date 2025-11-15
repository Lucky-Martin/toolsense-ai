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
      console.log(`[Firebase Cache] GET - Starting cache lookup for: ${query} (language: ${language})`);
      console.log(`[Firebase Cache] GET - Getting Admin DB...`);

      const db = getAdminDb();
      console.log(`[Firebase Cache] GET - Admin DB obtained successfully`);

      const normalizedQuery = this.normalizeQuery(query);
      // Cache key is based ONLY on normalized query + language, NOT userId
      // This ensures cache is shared across all users
      const cacheKey = this.getCacheKey(normalizedQuery, language);

      console.log(`[Firebase Cache] GET - Checking cache: query="${query}", language="${language}", normalized="${normalizedQuery}", cacheKey="${cacheKey}"`);

      // Get cached response using Admin SDK (shared across all users)
      const cachedResponseRef = db.collection(CACHED_RESPONSES_COLLECTION).doc(cacheKey);
      console.log(`[Firebase Cache] GET - Fetching document from collection: ${CACHED_RESPONSES_COLLECTION}, doc: ${cacheKey}`);

      const cachedResponseSnap = await cachedResponseRef.get();
      console.log(`[Firebase Cache] GET - Document exists: ${cachedResponseSnap.exists}`);

      if (!cachedResponseSnap.exists) {
        console.log(`[Firebase Cache] GET - Cache miss for: ${query} (language: ${language}, normalized: ${normalizedQuery})`);
        return null;
      }

      const cachedData = cachedResponseSnap.data() as CachedResponse;
      console.log(`[Firebase Cache] GET - Cached data retrieved, timestamp: ${cachedData.timestamp}`);

      // Check if expired
      if (this.isExpired(cachedData.timestamp)) {
        console.log(`[Firebase Cache] GET - Cache expired for: ${query} (language: ${language})`);
        return null;
      }

      // Track user access if userId is provided (for analytics, not filtering)
      if (userId) {
        try {
          console.log(`[Firebase Cache] GET - Tracking user access for userId: ${userId}`);
          await this.trackUserAccess(userId, cacheKey);
        } catch (trackError) {
          // Don't fail if tracking fails
          console.warn("[Firebase Cache] GET - Failed to track user access:", trackError);
        }
      }

      // Cache hit - this response is shared across all users with same query + language
      console.log(`[Firebase Cache] GET - Cache hit for: ${query} (language: ${language}, normalized: ${normalizedQuery}${userId ? `, userId: ${userId}` : ""}), response length: ${cachedData.response.length}`);
      return cachedData.response;
    } catch (error) {
      console.error("[Firebase Cache] GET - Error getting cached response from Firebase:", error);
      console.error("[Firebase Cache] GET - Error details:", error instanceof Error ? error.message : String(error));
      console.error("[Firebase Cache] GET - Error stack:", error instanceof Error ? error.stack : "No stack trace");
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
      console.log(`[Firebase Cache] SET - Starting cache operation for: ${query} (language: ${language})`);
      console.log(`[Firebase Cache] SET - Response length: ${response.length} characters`);
      console.log(`[Firebase Cache] SET - Getting Admin DB...`);

      const db = getAdminDb();
      console.log(`[Firebase Cache] SET - Admin DB obtained successfully`);

      const normalizedQuery = this.normalizeQuery(query);
      // Cache key is based ONLY on normalized query + language, NOT userId
      // This ensures cache is shared across all users
      const cacheKey = this.getCacheKey(normalizedQuery, language);

      console.log(`[Firebase Cache] SET - Cache details: query="${query}", language="${language}", normalized="${normalizedQuery}", cacheKey="${cacheKey}"`);

      // Store or update cached response using Admin SDK (shared across all users)
      const cachedResponseRef = db.collection(CACHED_RESPONSES_COLLECTION).doc(cacheKey);
      console.log(`[Firebase Cache] SET - Preparing to write to collection: ${CACHED_RESPONSES_COLLECTION}, doc: ${cacheKey}`);

      const cacheData = {
        normalizedQuery,
        query: query.trim(),
        language,
        response,
        timestamp: Timestamp.now(),
        model,
      };

      console.log(`[Firebase Cache] SET - Cache data prepared:`, {
        normalizedQuery,
        query: query.trim(),
        language,
        responseLength: response.length,
        timestamp: cacheData.timestamp.toString(),
        model,
      });

      console.log(`[Firebase Cache] SET - Calling Firestore set()...`);
      await cachedResponseRef.set(cacheData, { merge: true });
      console.log(`[Firebase Cache] SET - Successfully wrote to Firestore!`);

      // Track user access if userId is provided (for analytics, not filtering)
      if (userId) {
        try {
          console.log(`[Firebase Cache] SET - Tracking user access for userId: ${userId}`);
          await this.trackUserAccess(userId, cacheKey);
          console.log(`[Firebase Cache] SET - User access tracked successfully`);
        } catch (trackError) {
          // Don't fail if tracking fails
          console.warn("[Firebase Cache] SET - Failed to track user access:", trackError);
        }
      }

      console.log(`[Firebase Cache] SET - Successfully cached response for: ${query} (language: ${language}, normalized: ${normalizedQuery}${userId ? `, userId: ${userId}` : ""}) - This response is now available to all users`);
    } catch (error) {
      console.error("[Firebase Cache] SET - Error caching response to Firebase:", error);
      console.error("[Firebase Cache] SET - Error type:", error?.constructor?.name);
      console.error("[Firebase Cache] SET - Error message:", error instanceof Error ? error.message : String(error));
      console.error("[Firebase Cache] SET - Error stack:", error instanceof Error ? error.stack : "No stack trace");

      // Check if it's a credentials error
      if (error instanceof Error && error.message.includes("credentials")) {
        console.error("[Firebase Cache] SET - CREDENTIALS ERROR DETECTED!");
        console.error("[Firebase Cache] SET - Please set up Firebase Admin credentials:");
        console.error("[Firebase Cache] SET - Option 1: Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable with JSON string");
        console.error("[Firebase Cache] SET - Option 2: Set GOOGLE_APPLICATION_CREDENTIALS environment variable with path to service account JSON file");
        console.error("[Firebase Cache] SET - Option 3: Use Application Default Credentials (gcloud auth application-default login)");
      }

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

