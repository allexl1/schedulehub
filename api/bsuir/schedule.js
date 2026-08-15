import {
  resolveLessonsForDate,
  normalizeLesson
} from '../../src/utils/scheduleResolver.js';

/**
 * Get Upstash Redis credentials.
 *
 * Supports the common Vercel/Upstash environment variable names.
 */
function getRedisCredentials() {
  const url =
    process.env.UPSTASH_KV_REST_API_URL ||
    process.env.UPSTASH_URL_REST_API_URL ||
    process.env.UPSTASH_URL_REST_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;

  const token =
    process.env.UPSTASH_KV_REST_API_TOKEN ||
    process.env.UPSTASH_URL_REST_API_TOKEN ||
    process.env.UPSTASH_URL_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  return { url, token };
}

/**
 * Read a value from Upstash Redis.
 */
async function getRedisCache(key) {
  const { url, token } = getRedisCredentials();

  if (!url || !token) {
    return null;
  }

  try {
    const response = await fetch(
      `${url}/get/${encodeURIComponent(key)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.result) {
      return null;
    }

    return JSON.parse(data.result);
  } catch (error) {
    console.error('Redis GET failed:', error);
    return null;
  }
}

/**
 * Write a value to Upstash Redis.
 */
async function setRedisCache(key, value, ttlSeconds = 86400) {
  const { url, token } = getRedisCredentials();

  if (!url || !token) {
    return;
  }

  try {
    const encodedValue = encodeURIComponent(JSON.stringify(value));

    const response = await fetch(
      `${url}/set/${encodeURIComponent(key)}/${encodedValue}?ex=${ttlSeconds}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      console.error(
        'Redis SET failed:',
        response.status,
        await response.text()
      );
    }
  } catch (error) {
    // Cache failure should never break the schedule endpoint.
    console.error('Redis SET failed:', error);
  }
}

/**
 * Fetch the current BSUIR academic week.
 */
async function fetchCurrentWeek() {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000);

    const response = await fetch(
      'https://iis.bsuir.by/api/v1/schedule/current-week',
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json, text/plain, */*'
        }
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const value = await response.json();

      if (typeof value === 'number') {
        return value;
      }

      const parsed = parseInt(value, 10);

      return Number.isNaN(parsed) ? null : parsed;
    }

    const text = await response.text();
    const parsed = parseInt(text.trim(), 10);

    return Number.isNaN(parsed) ? null : parsed;
  } catch (error) {
    console.error('Failed to fetch current BSUIR week:', error);
    return null;
  }
}

/**
 * Empty fallback.
 *
 * IMPORTANT:
 * This is deliberately empty.
 * We do NOT want fake lessons appearing in the student's schedule.
 */
const MOCK_SCHEDULE = {
  studentGroupDto: {
    name: 'unknown'
  },
  schedules: {},
  exams: []
};

export default async function handler(req, res) {
  /*
   * Allow Vercel/CDN to cache the API response.
   */
  res.setHeader(
    'Cache-Control',
    's-maxage=86400, stale-while-revalidate=86400'
  );

  /*
   * Get group from:
   * /api/bsuir/schedule?group=...
   */
  const group = req.query.group;

  if (!group) {
    return res.status(400).json({
      success: false,
      error: 'Missing required group parameter'
    });
  }

  const cacheKey = `schedule:${group}`;

  let rawSchedule = null;
  let isFromCache = false;
  let isFallback = false;
  let debugMessage = null;

  /*
   * ============================================================
   * 1. TRY BSUIR API
   * ============================================================
   */
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    const bsuirUrl =
      'https://iis.bsuir.by/api/v1/schedule?studentGroup=' +
      encodeURIComponent(group);

    const bsuirResponse = await fetch(bsuirUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'ru,en;q=0.9',
        Referer: 'https://iis.bsuir.by/'
      }
    });

    clearTimeout(timeout);

    if (bsuirResponse.ok) {
      const contentType =
        bsuirResponse.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        debugMessage =
          'BSUIR API returned a non-JSON response.';

        console.error(debugMessage);
      } else {
        rawSchedule = await bsuirResponse.json();

debugMessage = {
  source: 'bsuir',
  rawKeys:
    rawSchedule && typeof rawSchedule === 'object'
      ? Object.keys(rawSchedule)
      : [],
  rawSample: rawSchedule
};

        /*
         * Only cache a response that actually contains
         * schedule data.
         */
        const hasSchedule =
          rawSchedule &&
          rawSchedule.schedules &&
          Object.keys(rawSchedule.schedules).length > 0;

        if (hasSchedule) {
          await setRedisCache(
            cacheKey,
            rawSchedule,
            86400
          );
        }
      }
    } else {
      const errorText = await bsuirResponse.text();

      debugMessage = {
        source: 'bsuir',
        status: bsuirResponse.status,
        body: errorText.substring(0, 1500)
      };

      console.error(
        'BSUIR API returned:',
        bsuirResponse.status,
        errorText.substring(0, 500)
      );
    }
  } catch (error) {
    debugMessage = {
      source: 'bsuir',
      error: error.message
    };

    console.error(
      'BSUIR API connection failed:',
      error
    );
  }

  /*
   * ============================================================
   * 2. TRY REDIS CACHE
   * ============================================================
   */
  if (!rawSchedule) {
    const cachedSchedule =
      await getRedisCache(cacheKey);

    const cacheHasSchedule =
      cachedSchedule &&
      cachedSchedule.schedules &&
      Object.keys(cachedSchedule.schedules).length > 0;

    if (cacheHasSchedule) {
      rawSchedule = cachedSchedule;
      isFromCache = true;
    }
  }

  /*
   * ============================================================
   * 3. FALLBACK
   * ============================================================
   */
  if (!rawSchedule) {
    rawSchedule = MOCK_SCHEDULE;
    isFallback = true;
  }

  /*
   * ============================================================
   * 4. CURRENT WEEK
   * ============================================================
   *
   * If BSUIR current-week endpoint fails, we still use week 1
   * rather than failing the entire schedule request.
   */
  const currentWeek =
    await fetchCurrentWeek();

  const resolvedWeek =
    currentWeek || 1;

  /*
   * ============================================================
   * 5. DETERMINE WHETHER WE HAVE REAL SCHEDULE DATA
   * ============================================================
   */
  const hasRealSchedule =
    rawSchedule &&
    rawSchedule.schedules &&
    Object.keys(rawSchedule.schedules).length > 0;

  /*
   * ============================================================
   * 6. RESOLVE TODAY'S LESSONS
   * ============================================================
   */
  let todayLessons = [];

  if (hasRealSchedule) {
    try {
      const todayLessonsRaw =
        resolveLessonsForDate(
          rawSchedule.schedules,
          new Date(),
          resolvedWeek,
          0
        );

      todayLessons =
        todayLessonsRaw.map(normalizeLesson);
    } catch (error) {
      console.error(
        'Failed to resolve today lessons:',
        error
      );

      debugMessage = {
        source: 'scheduleResolver',
        error: error.message
      };
    }
  }

  /*
   * First lesson is currently treated as next lesson.
   * The frontend can later make this more sophisticated
   * using the current time.
   */
  const nextLesson =
    todayLessons.length > 0
      ? { ...todayLessons[0] }
      : null;

  /*
   * ============================================================
   * 7. RESPONSE STATUS
   * ============================================================
   *
   * live:
   *   BSUIR responded successfully with real schedule data.
   *
   * cached:
   *   BSUIR failed/unavailable but Redis contained real data.
   *
   * fallback:
   *   Neither BSUIR nor Redis had usable data.
   */
  const status =
    isFallback
      ? 'fallback'
      : isFromCache
        ? 'cached'
        : 'live';

  return res.status(200).json({
    success: true,

    /*
     * Useful status flags for the frontend.
     */
    status,
    cached: isFromCache,
    fallback: isFallback,
    stale: isFromCache || isFallback,

    /*
     * Debug information.
     *
     * This is useful while we're getting the Vercel/BSUIR
     * connection working.
     */
    debug: debugMessage,

    data: {
      studentGroup:
        rawSchedule.studentGroupDto?.name ||
        group,

      schedules:
        rawSchedule.schedules || {},

      todaySchedules:
        todayLessons,

      exams:
        rawSchedule.exams || [],

      currentWeek:
        resolvedWeek,

      nextLesson
    }
  });
}