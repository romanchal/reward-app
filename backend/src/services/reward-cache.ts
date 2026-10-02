export type CacheInvalidateResult = {
  invalidated: boolean;
  key: string;
  message: string;
};

const cache = new Map<string, unknown>();

export async function clearRewardCache(): Promise<CacheInvalidateResult> {
  const key = 'reward:global:cache';
  const invalidated = cache.size > 0;
  cache.clear();

  return {
    invalidated,
    key,
    message: invalidated ? 'Application cache invalidated successfully.' : 'No active cache entries to invalidate.',
  };
}

export async function getCachedValue<T>(key: string, fallbackFactory: () => Promise<T> | T): Promise<T> {
  if (cache.has(key)) {
    return cache.get(key) as T;
  }

  const value = await fallbackFactory();
  cache.set(key, value);
  return value;
}
