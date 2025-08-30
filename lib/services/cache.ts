// Simple localStorage-based cache for market news and price history
// Includes cache key helpers and expiration logic

export interface CacheEntry<T> {
  data: T;
  expiresAt: number; // unix ms
  meta?: Record<string, unknown>;
}

const CACHE_PREFIX = 'predictions_cache_v1';

function getCacheKey(type: 'priceHistory' | 'news', marketId: string) {
  return `${CACHE_PREFIX}:${type}:${marketId}`;
}

export function setCache<T>(type: 'priceHistory' | 'news', marketId: string, data: T, ttlMs: number, meta?: Record<string, unknown>) {
  const expiresAt = Date.now() + ttlMs;
  const entry: CacheEntry<T> = { data, expiresAt, meta };
  localStorage.setItem(getCacheKey(type, marketId), JSON.stringify(entry));
}

export function getCache<T>(type: 'priceHistory' | 'news', marketId: string): CacheEntry<T> | null {
  const raw = localStorage.getItem(getCacheKey(type, marketId));
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(getCacheKey(type, marketId));
      return null;
    }
    return entry;
  } catch {
    localStorage.removeItem(getCacheKey(type, marketId));
    return null;
  }
}

export function invalidateCache(type: 'priceHistory' | 'news', marketId: string) {
  localStorage.removeItem(getCacheKey(type, marketId));
}
