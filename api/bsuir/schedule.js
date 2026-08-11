// Helper to dynamically locate Upstash credentials with custom prefix
function getRedisCredentials() {
  const url = process.env.UPSTASH_URL_REST_API_URL || 
              process.env.UPSTASH_URL_REST_URL || 
              process.env.UPSTASH_REDIS_REST_URL || 
              process.env.KV_REST_API_URL;

  const token = process.env.UPSTASH_URL_REST_API_TOKEN || 
                process.env.UPSTASH_URL_REST_TOKEN || 
                process.env.UPSTASH_REDIS_REST_TOKEN || 
                process.env.KV_REST_API_TOKEN;

  return { url, token };
}

async function getRedisCache(key) {
  const { url, token } = getRedisCredentials();
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch {
    return null;
  }
}

async function setRedisCache(key, value, ttlSeconds = 86400) {
  const { url, token } = getRedisCredentials();
  if (!url || !token) return;

  try {
    await fetch(`${url}/set/${key}/${encodeURIComponent(JSON.stringify(value))}?ex=${ttlSeconds}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch {
    // Fail silently if cache write fails
  }
}
