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

// Fallback mock schedule if BSUIR API blocks Vercel IPs and Redis is empty
const MOCK_SCHEDULE = {
  studentGroupDto: { name: '150501' },
  schedules: {},
  todaySchedules: [
    {
      subject: 'Computer Networks',
      lessonTypeAbbrev: 'Lecture',
      auditories: ['201-4'],
      employees: [{ fio: 'Ivanov A.A.' }],
      startLessonTime: '09:00',
      endLessonTime: '10:20'
    }
  ]
};

async function fetchCurrentWeek() {
  try {
    const res = await fetch(
      'https://iis.bsuir.by/api/v1/schedule/current-week',
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    if (!res.ok) {
      return null;
    }

    const value = await res.json();

    return typeof value === 'number'
      ? value
      : parseInt(value, 10);

  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400');

  const group = req.query.group || '150501';
  const cacheKey = `schedule:${group}`;

  let rawSchedule = null;
  let isFromCache = false;
  let isFallback = false;
  let debugMessage = null;

  // 1. Try BSUIR IIS API
  try {
  const bsuirRes = await fetch(
    `https://iis.bsuir.by/api/v1/schedule?studentGroup=${group}`
  );

  if (bsuirRes.ok) {
    rawSchedule = await bsuirRes.json();
  } else {
    debugMessage = {
      status: bsuirRes.status,
      body: await bsuirRes.text()
    };
  }
} catch (err) {
  debugMessage = err.message;
}

  // 2. Try Upstash Redis Cache
  if (!rawSchedule) {
    rawSchedule = await getRedisCache(cacheKey);
    if (rawSchedule) isFromCache = true;
  }

  // 3. Fallback to Mock Data (prevents 500/empty errors when Vercel IPs are geoblocked)
  if (!rawSchedule) {
    rawSchedule = MOCK_SCHEDULE;
    isFallback = true;
  }
  
  const currentWeek = await fetchCurrentWeek();

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
    fallback: isFallback,
    debug: debugMessage,
    data: {
      studentGroup: rawSchedule.studentGroupDto?.name || group,
      schedules: rawSchedule.schedules || {},
      todaySchedules: todayLessons,
      exams: rawSchedule.exams || [],
      currentWeek: currentWeek || 1,
      nextLesson: nextLesson
    }
  });
}
