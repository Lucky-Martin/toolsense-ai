/**
 * Client-Side Cache Service
 *
 * Uses IndexedDB for storing cached API responses.
 * IndexedDB is better suited for large data (API responses) compared to localStorage.
 */

interface CacheEntry {
  query: string;
  normalizedQuery: string;
  language: string;
  response: string;
  timestamp: string;
  model: string;
}

const DB_NAME = "toolsense_cache";
const DB_VERSION = 1;
const STORE_NAME = "assessments";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

class ClientCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB database
   */
  private async initDB(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        console.warn("IndexedDB not available");
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("normalizedQuery", "normalizedQuery", { unique: false });
          store.createIndex("language", "language", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Normalize a query to improve cache hits
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
   * Generate a cache key from the query and language
   */
  private getCacheKey(query: string, language: string = "en"): string {
    const normalizedQuery = this.normalizeQuery(query);
    return `${normalizedQuery}:${language}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const entryTime = new Date(entry.timestamp).getTime();
    const now = Date.now();
    return now - entryTime > MAX_AGE;
  }

  /**
   * Get cached response if available and not expired
   */
  async get(query: string, language: string = "en"): Promise<string | null> {
    if (typeof window === "undefined" || !window.indexedDB) {
      return null;
    }

    try {
      await this.initDB();
      if (!this.db) return null;

      const normalizedQuery = this.normalizeQuery(query);
      const cacheKey = this.getCacheKey(query, language);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("normalizedQuery");
        const request = index.getAll(normalizedQuery);

        request.onsuccess = () => {
          const entries = request.result as CacheEntry[];

          // Find matching entry with same language and not expired
          const entry = entries.find(
            (e) => e.language === language && !this.isExpired(e)
          );

          if (entry) {
            console.log(`Cache hit for: ${query} (language: ${language}, normalized: ${cacheKey})`);
            resolve(entry.response);
          } else {
            console.log(`Cache miss for: ${query} (language: ${language}, normalized: ${cacheKey})`);
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error("Error reading from cache:", request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error("Error accessing cache:", error);
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set(
    query: string,
    response: string,
    model: string = "gemini-2.5-pro",
    language: string = "en"
  ): Promise<void> {
    if (typeof window === "undefined" || !window.indexedDB) {
      return;
    }

    try {
      await this.initDB();
      if (!this.db) return;

      const normalizedQuery = this.normalizeQuery(query);
      const cacheKey = this.getCacheKey(query, language);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        // Add/update entry (put will overwrite if key exists)
        const entry: CacheEntry & { id: string } = {
          id: cacheKey,
          query: query.trim(),
          normalizedQuery,
          language,
          response,
          timestamp: new Date().toISOString(),
          model,
        };

        const putRequest = store.put(entry);

        putRequest.onsuccess = () => {
          console.log(`Cached response for: ${query} (language: ${language}, normalized: ${cacheKey})`);
          resolve();
        };

        putRequest.onerror = () => {
          console.error("Error saving to cache:", putRequest.error);
          resolve(); // Don't reject, just log error
        };
      });
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  }

  /**
   * Clear expired entries from cache
   */
  async clearExpired(): Promise<void> {
    if (typeof window === "undefined" || !window.indexedDB || !this.db) {
      return;
    }

    try {
      await this.initDB();
      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index("timestamp");
        const request = index.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const entry = cursor.value as CacheEntry;
            if (this.isExpired(entry)) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => {
          console.error("Error clearing expired cache:", request.error);
          resolve();
        };
      });
    } catch (error) {
      console.error("Error clearing expired cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ total: number; expired: number; valid: number }> {
    if (typeof window === "undefined" || !window.indexedDB || !this.db) {
      return { total: 0, expired: 0, valid: 0 };
    }

    try {
      await this.initDB();
      if (!this.db) return { total: 0, expired: 0, valid: 0 };

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result as CacheEntry[];
          const expired = entries.filter((e) => this.isExpired(e)).length;
          resolve({
            total: entries.length,
            expired,
            valid: entries.length - expired,
          });
        };

        request.onerror = () => {
          console.error("Error getting cache stats:", request.error);
          resolve({ total: 0, expired: 0, valid: 0 });
        };
      });
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return { total: 0, expired: 0, valid: 0 };
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    if (typeof window === "undefined" || !window.indexedDB || !this.db) {
      return;
    }

    try {
      await this.initDB();
      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log("Cache cleared");
          resolve();
        };

        request.onerror = () => {
          console.error("Error clearing cache:", request.error);
          resolve();
        };
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }
}

// Export singleton instance
export const clientCacheService = new ClientCacheService();

