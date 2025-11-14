/**
 * Cache Service
 *
 * Provides lightweight local caching for security assessments.
 * Uses JSON file storage with timestamps for reproducibility.
 */

import fs from "fs";
import path from "path";

interface CacheEntry {
  query: string;
  normalizedQuery: string;
  language: string;
  response: string;
  timestamp: string;
  model: string;
}

interface CacheData {
  entries: CacheEntry[];
}

class CacheService {
  private cacheDir: string;
  private cacheFile: string;
  private maxAge: number; // Cache expiration in milliseconds (7 days default)

  constructor() {
    // Use .next/cache or create a cache directory in the project root
    this.cacheDir = path.join(process.cwd(), ".cache");
    this.cacheFile = path.join(this.cacheDir, "assessments.json");
    this.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Ensure cache directory exists
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

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
   * Generate a cache key from the query and language
   */
  private getCacheKey(query: string, language: string = "en"): string {
    const normalizedQuery = this.normalizeQuery(query);
    return `${normalizedQuery}:${language}`;
  }

  /**
   * Load cache from file
   */
  private loadCache(): CacheData {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, "utf-8");
        return JSON.parse(data) as CacheData;
      }
    } catch (error) {
      console.error("Error loading cache:", error);
    }
    return { entries: [] };
  }

  /**
   * Save cache to file
   */
  private saveCache(cache: CacheData): void {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2), "utf-8");
    } catch (error) {
      console.error("Error saving cache:", error);
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const entryTime = new Date(entry.timestamp).getTime();
    const now = Date.now();
    return now - entryTime > this.maxAge;
  }

  /**
   * Get cached response if available and not expired
   */
  get(query: string, language: string = "en"): string | null {
    const cacheKey = this.getCacheKey(query, language);
    const cache = this.loadCache();

    const normalizedQuery = this.normalizeQuery(query);
    const entry = cache.entries.find(
      (e) => e.normalizedQuery === normalizedQuery && e.language === language && !this.isExpired(e)
    );

    if (entry) {
      console.log(`Cache hit for: ${query} (language: ${language}, normalized: ${cacheKey})`);
      return entry.response;
    }

    console.log(`Cache miss for: ${query} (language: ${language}, normalized: ${cacheKey})`);
    return null;
  }

  /**
   * Store response in cache
   */
  set(query: string, response: string, model: string = "gemini-2.5-pro", language: string = "en"): void {
    const cacheKey = this.getCacheKey(query, language);
    const cache = this.loadCache();

    // Remove old entry if exists (same query and language)
    cache.entries = cache.entries.filter(
      (e) => !(e.normalizedQuery === this.normalizeQuery(query) && e.language === language)
    );

    // Add new entry
    const entry: CacheEntry = {
      query: query.trim(),
      normalizedQuery: this.normalizeQuery(query),
      language,
      response,
      timestamp: new Date().toISOString(),
      model,
    };

    cache.entries.push(entry);

    // Keep only last 1000 entries to prevent file from growing too large
    if (cache.entries.length > 1000) {
      cache.entries = cache.entries
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1000);
    }

    this.saveCache(cache);
    console.log(`Cached response for: ${query} (language: ${language}, normalized: ${cacheKey})`);
  }

  /**
   * Clear expired entries from cache
   */
  clearExpired(): void {
    const cache = this.loadCache();
    const beforeCount = cache.entries.length;
    cache.entries = cache.entries.filter((e) => !this.isExpired(e));
    const afterCount = cache.entries.length;

    if (beforeCount !== afterCount) {
      this.saveCache(cache);
      console.log(`Cleared ${beforeCount - afterCount} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { total: number; expired: number; valid: number } {
    const cache = this.loadCache();
    const expired = cache.entries.filter((e) => this.isExpired(e)).length;
    return {
      total: cache.entries.length,
      expired,
      valid: cache.entries.length - expired,
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();

