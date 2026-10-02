import Redis from 'redis';

let client: ReturnType<typeof Redis.createClient> | null = null;

export async function getRedisClient() {
  if (!client) {
    client = Redis.createClient({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    });

    client.on('error', (error) => {
      console.warn('[Redis]', error.message);
    });

    await client.connect();
  }

  return client;
}

export async function clearRedisCache(namespace?: string) {
  try {
    const redis = await getRedisClient();
    if (namespace) {
      const matches = await redis.keys(`${namespace}:*`);
      if (matches.length) {
        await redis.del(matches);
      }
      return { invalidated: true, namespace, keys: matches.length };
    }

    await redis.flushAll();
    return { invalidated: true, namespace: 'all', keys: 0 };
  } catch (error) {
    console.warn('[Redis cache clear failed]', error);
    return { invalidated: false, namespace: namespace ?? 'all', keys: 0 };
  }
}
