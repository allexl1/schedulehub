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

  const group = req.query.group || '150501';
  const cacheKey = `schedule:${group}`;

  let rawSchedule = null;
  let isFromCache = false;
  let fetchError = null;

  // 1. Attempt fetch from official BSUIR IIS API with browser headers
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout safeguard

    const bsuirRes = await fetch(`https://iis.bsuir.by/api/v1/schedule?studentGroup=${group}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    clearTimeout(timeout);

    if (bsuirRes.ok) {
      rawSchedule = await bsuirRes.json();
      await setRedisCache(cacheKey, rawSchedule, 86400);
    } else {
      fetchError = `BSUIR API HTTP ${bsuirRes.status}`;
    }
  } catch (err) {
    fetchError = err.message;
  }

  // 2. Fall back to Upstash Redis cache if BSUIR API fails or times out
  if (!rawSchedule) {
    rawSchedule = await getRedisCache(cacheKey);
    if (rawSchedule) isFromCache = true;
  }

  if (!rawSchedule) {
    return res.status(200).json({
      success: false,
      error: `BSUIR API unreachable (${fetchError}) and no Redis cache found`,
      data: null
    });
  }

  // Extract next lesson helper for reminders endpoint
  const todayLessons = rawSchedule.todaySchedules || [];
  const nextLesson = todayLessons.length > 0 ? {
    subject: todayLessons[0].subject || todayLessons[0].lessonTypeAbbrev || 'Lesson',
    type: todayLessons[0].lessonTypeAbbrev || 'Lecture',
    room: todayLessons[0].auditories?.[0] || 'N/A',
    teacher: todayLessons[0].employees?.[0]?.fio || 'Faculty',
    time: todayLessons[0].startLessonTime || '09:00',
    startsInMinutes: 15
  } : null;

  return res.status(200).json({
    success: true,
    cached: isFromCache,
    data: {
      studentGroup: rawSchedule.studentGroupDto?.name || group,
      schedules: rawSchedule.schedules || {},
      todaySchedules: todayLessons,
      nextLesson: nextLesson
    }
  });
}
