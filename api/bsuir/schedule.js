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
async function setRedisCache(
  key,
  value,
  ttlSeconds = 86400
) {
  const { url, token } = getRedisCredentials();

  if (!url || !token) {
    return;
  }

  try {
    const encodedValue = encodeURIComponent(
      JSON.stringify(value)
    );

    const response = await fetch(
      `${url}/set/${encodeURIComponent(
        key
      )}/${encodedValue}?ex=${ttlSeconds}`,
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
    console.error('Redis SET failed:', error);
  }
}

/**
 * Determine whether an object contains a usable
 * BSUIR timetable.
 *
 * IMPORTANT:
 *
 * BSUIR can return:
 *
 * schedules: null
 * nextSchedules: { ...real lessons... }
 *
 * Therefore checking only schedules is WRONG.
 */
function hasUsableSchedule(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const schedules =
    data.schedules;

  if (
    schedules &&
    typeof schedules === 'object' &&
    Object.keys(schedules).length > 0
  ) {
    return true;
  }

  const nextSchedules =
    data.nextSchedules;

  if (
    nextSchedules &&
    typeof nextSchedules === 'object' &&
    Object.keys(nextSchedules).length > 0
  ) {
    return true;
  }

  return false;
}

/**
 * Get the timetable that should be exposed to
 * the frontend/resolver.
 *
 * Current BSUIR behaviour:
 *
 * {
 *   schedules: null,
 *   nextSchedules: {
 *     Понедельник: [...],
 *     ...
 *   }
 * }
 *
 * Older responses may have schedules directly.
 */
function getUsableSchedules(data) {
  if (!data || typeof data !== 'object') {
    return {};
  }

  if (
    data.schedules &&
    typeof data.schedules === 'object' &&
    Object.keys(data.schedules).length > 0
  ) {
    return data.schedules;
  }

  if (
    data.nextSchedules &&
    typeof data.nextSchedules === 'object' &&
    Object.keys(data.nextSchedules).length > 0
  ) {
    return data.nextSchedules;
  }

  return {};
}

/**
 * Convert BSUIR date strings into a Date safely.
 *
 * Supports:
 *   DD.MM.YYYY
 *   YYYY-MM-DD
 *   ISO datetime strings
 */
function parseCalendarDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  let match = trimmed.match(
    /^(\d{2})\.(\d{2})\.(\d{4})/
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(
      year,
      month - 1,
      day
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(
      year,
      month - 1,
      day
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
}

/**
 * Format a Date as YYYY-MM-DD.
 */
function formatDateKey(value) {
  const date = parseCalendarDate(value);

  if (!date) {
    return null;
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get today's local calendar date.
 */
function getTodayDate() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}

/**
 * Fetch the current BSUIR academic week.
 */
async function fetchCurrentWeek() {
  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 5000);

    const response =
      await fetch(
        'https://iis.bsuir.by/api/v1/schedule/current-week',
        {
          signal: controller.signal,
          headers: {
            Accept:
              'application/json, text/plain, */*'
          }
        }
      );

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get(
        'content-type'
      ) || '';

    if (
      contentType.includes(
        'application/json'
      )
    ) {
      const value =
        await response.json();

      if (typeof value === 'number') {
        return value;
      }

      const parsed =
        parseInt(value, 10);

      return Number.isNaN(parsed)
        ? null
        : parsed;
    }

    const text =
      await response.text();

    const parsed =
      parseInt(
        text.trim(),
        10
      );

    return Number.isNaN(parsed)
      ? null
      : parsed;
  } catch (error) {
    console.error(
      'Failed to fetch current BSUIR week:',
      error
    );

    return null;
  }
}

/**
 * Empty fallback.
 *
 * We never manufacture fake lessons.
 */
const MOCK_SCHEDULE = {
  studentGroupDto: {
    name: 'unknown'
  },

  schedules: {},

  nextSchedules: {},

  exams: [],

  startDate: null,

  endDate: null,

  startExamsDate: null,

  endExamsDate: null
};

export default async function handler(
  req,
  res
) {
  /*
   * Allow Vercel/CDN to cache the API response.
   *
   * The actual Redis cache is also used below.
   */
  res.setHeader(
    'Cache-Control',
    's-maxage=3600, stale-while-revalidate=86400'
  );

  /*
   * ------------------------------------------------------------
   * 1. READ GROUP
   * ------------------------------------------------------------
   */

  const group =
    typeof req.query.group === 'string'
      ? req.query.group.trim()
      : '';

  if (!group) {
    return res.status(400).json({
      success: false,
      error:
        'Missing required group parameter'
    });
  }

  const cacheKey =
    `schedule:${group}`;

  let rawSchedule = null;

  let isFromCache = false;

  let isFallback = false;

  let debugMessage = null;

  /*
   * ------------------------------------------------------------
   * 2. FETCH BSUIR
   * ------------------------------------------------------------
   */

  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 15000);

    const bsuirUrl =
      'https://iis.bsuir.by/api/v1/schedule' +
      '?studentGroup=' +
      encodeURIComponent(group);

    const bsuirResponse =
      await fetch(
        bsuirUrl,
        {
          signal:
            controller.signal,

          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

            Accept:
              'application/json, text/plain, */*',

            'Accept-Language':
              'ru,en;q=0.9',

            Referer:
              'https://iis.bsuir.by/'
          }
        }
      );

    clearTimeout(timeout);

    if (!bsuirResponse.ok) {
      const errorText =
        await bsuirResponse.text();

      debugMessage = {
        source: 'bsuir',

        status:
          bsuirResponse.status,

        body:
          errorText.substring(
            0,
            1500
          )
      };

      console.error(
        'BSUIR API returned:',
        bsuirResponse.status,
        errorText.substring(
          0,
          500
        )
      );
    } else {
      const contentType =
        bsuirResponse.headers.get(
          'content-type'
        ) || '';

      if (
        !contentType.includes(
          'application/json'
        )
      ) {
        debugMessage = {
          source: 'bsuir',

          error:
            'BSUIR API returned a non-JSON response.'
        };

        console.error(
          debugMessage.error
        );
      } else {
        const responseData =
          await bsuirResponse.json();

        /*
         * Keep the complete BSUIR response.
         *
         * DO NOT reduce it to rawSchedule.schedules.
         *
         * nextSchedules is important because BSUIR can
         * legitimately return schedules: null.
         */
        rawSchedule =
          responseData;

        const usableSchedules =
          getUsableSchedules(
            rawSchedule
          );

        debugMessage = {
          source: 'bsuir',

          rawKeys:
            rawSchedule &&
            typeof rawSchedule ===
              'object'
              ? Object.keys(
                  rawSchedule
                )
              : [],

          scheduleSource:
            rawSchedule?.schedules &&
            Object.keys(
              rawSchedule.schedules
            ).length > 0
              ? 'schedules'
              : rawSchedule?.nextSchedules &&
                  Object.keys(
                    rawSchedule.nextSchedules
                  ).length > 0
                ? 'nextSchedules'
                : 'none',

          scheduleDayCount:
            Object.keys(
              usableSchedules
            ).length,

          studentGroup:
            rawSchedule
              ?.studentGroupDto
              ?.name ||
            group,

          startDate:
            rawSchedule?.startDate ||
            null,

          endDate:
            rawSchedule?.endDate ||
            null
        };

        /*
         * Cache ANY response that contains a usable
         * timetable source.
         *
         * This fixes the old bug where nextSchedules
         * was valid but wasn't cached.
         */
        if (
          hasUsableSchedule(
            rawSchedule
          )
        ) {
          await setRedisCache(
            cacheKey,
            rawSchedule,
            86400
          );
        }
      }
    }
  } catch (error) {
    debugMessage = {
      source: 'bsuir',

      error:
        error?.message ||
        String(error)
    };

    console.error(
      'BSUIR API connection failed:',
      error
    );
  }

  /*
   * ------------------------------------------------------------
   * 3. REDIS FALLBACK
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   * Cached nextSchedules are also valid.
   */

  if (
    !rawSchedule ||
    !hasUsableSchedule(
      rawSchedule
    )
  ) {
    const cachedSchedule =
      await getRedisCache(
        cacheKey
      );

    if (
      cachedSchedule &&
      hasUsableSchedule(
        cachedSchedule
      )
    ) {
      rawSchedule =
        cachedSchedule;

      isFromCache = true;

      debugMessage = {
        ...(typeof debugMessage ===
        'object'
          ? debugMessage
          : {}),

        cache:
          'Using cached BSUIR schedule',

        scheduleSource:
          cachedSchedule.schedules &&
          Object.keys(
            cachedSchedule.schedules
          ).length > 0
            ? 'schedules'
            : cachedSchedule.nextSchedules &&
                Object.keys(
                  cachedSchedule.nextSchedules
                ).length > 0
              ? 'nextSchedules'
              : 'none'
      };
    }
  }

  /*
   * ------------------------------------------------------------
   * 4. FINAL FALLBACK
   * ------------------------------------------------------------
   */

  if (!rawSchedule) {
    rawSchedule =
      MOCK_SCHEDULE;

    isFallback = true;
  }

  /*
   * If BSUIR returned an object but it had no usable
   * timetable, do not pretend it is a live timetable.
   */
  if (
    !hasUsableSchedule(
      rawSchedule
    )
  ) {
    isFallback = true;
  }

  /*
   * ------------------------------------------------------------
   * 5. GET ACTUAL TIMETABLE SOURCE
   * ------------------------------------------------------------
   *
   * This is the crucial change:
   *
   * schedules OR nextSchedules.
   */

  const usableSchedules =
    getUsableSchedules(
      rawSchedule
    );

  /*
   * ------------------------------------------------------------
   * 6. CURRENT ACADEMIC WEEK
   * ------------------------------------------------------------
   */

  const fetchedCurrentWeek =
    await fetchCurrentWeek();

  const resolvedWeek =
    Number.isFinite(
      Number(
        fetchedCurrentWeek
      )
    ) &&
    Number(
      fetchedCurrentWeek
    ) > 0
      ? Number(
          fetchedCurrentWeek
        )
      : Number(
          rawSchedule?.currentWeek
        ) || 1;

  /*
   * ------------------------------------------------------------
   * 7. RESOLVE TODAY BY CALENDAR DATE
   * ------------------------------------------------------------
   *
   * The resolver is now date-first.
   *
   * We deliberately pass the complete API-style object,
   * not just schedules, because the resolver understands
   * schedules/nextSchedules and date ranges.
   */

  const today =
    getTodayDate();

  let todayLessons = [];

  if (
    hasUsableSchedule(
      rawSchedule
    )
  ) {
    try {
      const resolverInput = {
        ...rawSchedule,

        /*
         * Keep schedules populated so the current
         * ScheduleView/resolver can consume the returned
         * `data.schedules` directly.
         */
        schedules:
          usableSchedules
      };

      const resolved =
        resolveLessonsForDate(
          resolverInput,
          today,
          resolvedWeek,
          0
        );

      todayLessons =
        Array.isArray(
          resolved
        )
          ? resolved.map(
              normalizeLesson
            )
          : [];
    } catch (error) {
      console.error(
        'Failed to resolve today lessons:',
        error
      );

      debugMessage = {
        ...(typeof debugMessage ===
        'object'
          ? debugMessage
          : {}),

        resolver: {
          error:
            error?.message ||
            String(error)
        }
      };

      /*
       * Do not destroy the underlying timetable
       * because only today's resolution failed.
       */
      todayLessons = [];
    }
  }

  /*
   * ------------------------------------------------------------
   * 8. NEXT LESSON
   * ------------------------------------------------------------
   *
   * Keep this conservative.
   *
   * ScheduleView can determine current/next status
   * using the actual current time.
   */

  const nextLesson =
    todayLessons.length > 0
      ? {
          ...todayLessons[0]
        }
      : null;

  /*
   * ------------------------------------------------------------
   * 9. STATUS
   * ------------------------------------------------------------
   */

  let status = 'live';

  if (isFallback) {
    status = 'fallback';
  } else if (isFromCache) {
    status = 'cached';
  }

  /*
   * ------------------------------------------------------------
   * 10. RESPONSE
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * `schedules` now contains the REAL usable timetable,
   * even when BSUIR originally called it `nextSchedules`.
   *
   * This keeps the frontend contract stable while fixing
   * the backend source selection.
   */

  return res.status(200).json({
    success: true,

    status,

    cached:
      isFromCache,

    fallback:
      isFallback,

    stale:
      isFromCache || isFallback,

    debug:
      debugMessage,

    data: {
      studentGroup:
        rawSchedule
          ?.studentGroupDto
          ?.name ||
        group,

      /*
       * The frontend gets the usable timetable here.
       *
       * This is NOT necessarily rawSchedule.schedules.
       * It may be rawSchedule.nextSchedules.
       */
      schedules:
        usableSchedules,

      /*
       * Preserve nextSchedules too.
       *
       * Useful for debugging and future UI logic.
       */
      nextSchedules:
        rawSchedule?.nextSchedules ||
        {},

      /*
       * Preserve the original BSUIR schedules value.
       */
      rawSchedules:
        rawSchedule?.schedules ||
        null,

      /*
       * Calendar/term boundaries.
       */
      scheduleStartDate:
        rawSchedule?.startDate ||
        null,

      scheduleEndDate:
        rawSchedule?.endDate ||
        null,

      examsStartDate:
        rawSchedule?.startExamsDate ||
        null,

      examsEndDate:
        rawSchedule?.endExamsDate ||
        null,

      /*
       * Useful canonical date for the frontend.
       */
      todayDate:
        formatDateKey(today),

      /*
       * Lessons resolved specifically for today.
       */
      todaySchedules:
        todayLessons,

      exams:
        Array.isArray(
          rawSchedule?.exams
        )
          ? rawSchedule.exams
          : [],

      currentWeek:
        resolvedWeek,

      nextLesson
    }
  });
}
