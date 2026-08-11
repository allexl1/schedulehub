function getRedisCredentials() {
  const url = process.env.UPSTASH_KV_REST_API_URL ||
              process.env.UPSTASH_URL_REST_API_URL || 
              process.env.UPSTASH_URL_REST_URL || 
              process.env.UPSTASH_REDIS_REST_URL || 
              process.env.KV_REST_API_URL;

  const token = process.env.UPSTASH_KV_REST_API_TOKEN ||
                process.env.UPSTASH_URL_REST_API_TOKEN || 
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
    // Fail silently
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400');

  try {
    const group = req.query.group || '150501';
    const cacheKey = `schedule:${group}`;

    let scheduleData = null;
    let isFromCache = false;

    // 1. Fetch fresh schedule from official BSUIR API
    try {
      const bsuirRes = await fetch(`https://iis.bsuir.by/api/v1/schedule?studentGroup=${group}`);
      if (bsuirRes.ok) {
        scheduleData = await bsuirRes.json();
        await setRedisCache(cacheKey, scheduleData, 86400);
      }
    } catch (err) {
      console.error('BSUIR API fetch error:', err);
    }

    // 2. Fall back to Upstash Redis cache if BSUIR API fails
    if (!scheduleData) {
      scheduleData = await getRedisCache(cacheKey);
      isFromCache = true;
    }

    if (!scheduleData) {
      return res.status(200).json({
        success: false,
        error: 'Unable to fetch schedule from BSUIR API or Redis cache',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      cached: isFromCache,
      data: scheduleData
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      error: error.message || 'Server error processing schedule',
      data: null
    });
  }
}
