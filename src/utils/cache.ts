/**
 * File-based cache with TTL support
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  directory: string;
  ttl: number; // in seconds
  enabled: boolean;
}

/**
 * Simple file-based cache with TTL
 */
export class Cache {
  private options: CacheOptions;

  constructor(options: CacheOptions) {
    this.options = options;

    // Create cache directory if it doesn't exist
    if (options.enabled && !fs.existsSync(options.directory)) {
      fs.mkdirSync(options.directory, { recursive: true });
    }
  }

  /**
   * Generate a cache key from request parameters
   */
  private generateKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get the file path for a cache key
   */
  private getFilePath(key: string): string {
    const hashedKey = this.generateKey(key);
    return path.join(this.options.directory, `${hashedKey}.json`);
  }

  /**
   * Get a value from cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    if (!this.options.enabled) {
      return null;
    }

    const filePath = this.getFilePath(key);

    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content) as CacheEntry<T>;

      // Check if expired
      const now = Date.now();
      const age = (now - entry.timestamp) / 1000; // age in seconds

      if (age > entry.ttl) {
        // Expired - delete the file
        fs.unlinkSync(filePath);
        return null;
      }

      return entry.data;
    } catch (error) {
      // If there's an error reading/parsing, treat as cache miss
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    if (!this.options.enabled) {
      return;
    }

    const filePath = this.getFilePath(key);
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl ?? this.options.ttl,
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    } catch (error) {
      // Silently fail if we can't write cache
      // (cache is a performance optimization, not critical)
    }
  }

  /**
   * Invalidate a specific cache key
   */
  invalidate(key: string): void {
    if (!this.options.enabled) {
      return;
    }

    const filePath = this.getFilePath(key);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    if (!this.options.enabled) {
      return;
    }

    try {
      if (fs.existsSync(this.options.directory)) {
        const files = fs.readdirSync(this.options.directory);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(this.options.directory, file));
          }
        }
      }
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalEntries: number; totalSize: number } {
    if (!this.options.enabled || !fs.existsSync(this.options.directory)) {
      return { totalEntries: 0, totalSize: 0 };
    }

    try {
      const files = fs.readdirSync(this.options.directory).filter((f) => f.endsWith('.json'));
      const totalSize = files.reduce((sum, file) => {
        const stats = fs.statSync(path.join(this.options.directory, file));
        return sum + stats.size;
      }, 0);

      return {
        totalEntries: files.length,
        totalSize,
      };
    } catch (error) {
      return { totalEntries: 0, totalSize: 0 };
    }
  }
}

/**
 * Global cache instance (to be initialized by config loader)
 */
let globalCache: Cache | null = null;

/**
 * Initialize the global cache
 */
export function initCache(options: CacheOptions): Cache {
  globalCache = new Cache(options);
  return globalCache;
}

/**
 * Get the global cache instance
 */
export function getCache(): Cache {
  if (!globalCache) {
    throw new Error('Cache not initialized. Call initCache() first.');
  }
  return globalCache;
}
