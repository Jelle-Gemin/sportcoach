interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMs: number = 300000): void { // 5 minutes default
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { data, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

const memoryCache = new MemoryCache();

// Clean up expired entries every 5 minutes
setInterval(() => memoryCache.cleanup(), 5 * 60 * 1000);

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Try cache first
  const cached = memoryCache.get<T>(key);
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache for next time
  memoryCache.set(key, data, ttl * 1000);

  return data;
}

export function invalidateCache(key: string): void {
  memoryCache.delete(key);
}

export function clearCache(): void {
  memoryCache.clear();
}

// TODO: Replace with Redis for production
// import Redis from "ioredis";
// const redis = new Redis(process.env.REDIS_URL);
