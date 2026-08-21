const EMPTY_DATA = {
  studentGroup: null,
  schedules: {},
  todaySchedules: [],
  exams: [],
  currentWeek: 1,
  nextLesson: null,
  cached: false,
  fallback: false,
  stale: false,
  debug: null
};

function normalizeGroup(group) {
  return String(group || '').trim();
}

function cacheKey(group) {
  return `sh_cached_schedule_${normalizeGroup(group)}`;
}

function timestampKey(group) {
  return `sh_cache_timestamp_${normalizeGroup(group)}`;
}

/* ============================================================
   CACHE
   ============================================================ */

export function readCachedSchedule(group) {
  const normalizedGroup = normalizeGroup(group);

  if (!normalizedGroup) {
    return null;
  }

  try {
    const value = localStorage.getItem(
      cacheKey(normalizedGroup)
    );

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value);

    if (
      !parsed ||
      typeof parsed !== 'object'
    ) {
      return null;
    }

    /*
     * Cache currently stores the complete API
     * response, so support both:
     *
     * { data: {...} }
     *
     * and directly stored normalized data.
     */
    const data =
      parsed.data &&
      typeof parsed.data === 'object'
        ? parsed.data
        : parsed;

    return {
      ...EMPTY_DATA,
      ...data,

      schedules:
        data.schedules &&
        typeof data.schedules === 'object'
          ? data.schedules
          : {},

      todaySchedules:
        Array.isArray(data.todaySchedules)
          ? data.todaySchedules
          : [],

      exams:
        Array.isArray(data.exams)
          ? data.exams
          : [],

      currentWeek:
        Number(data.currentWeek) || 1,

      nextLesson:
        data.nextLesson || null,

      cached: true
    };
  } catch (error) {
    console.error(
      'Failed to read cached schedule:',
      error
    );

    return null;
  }
}

export function readCacheTimestamp(group) {
  const normalizedGroup = normalizeGroup(group);

  if (!normalizedGroup) {
    return null;
  }

  try {
    return localStorage.getItem(
      timestampKey(normalizedGroup)
    );
  } catch {
    return null;
  }
}

export function saveCachedSchedule(group, json) {
  const normalizedGroup = normalizeGroup(group);

  if (!normalizedGroup || !json) {
    return;
  }

  try {
    localStorage.setItem(
      cacheKey(normalizedGroup),
      JSON.stringify(json)
    );

    localStorage.setItem(
      timestampKey(normalizedGroup),
      new Date().toISOString()
    );
  } catch (error) {
    console.error(
      'Failed to save schedule cache:',
      error
    );
  }
}

export function clearScheduleCache(group) {
  const normalizedGroup = normalizeGroup(group);

  if (!normalizedGroup) {
    return;
  }

  try {
    localStorage.removeItem(
      cacheKey(normalizedGroup)
    );

    localStorage.removeItem(
      timestampKey(normalizedGroup)
    );
  } catch (error) {
    console.error(
      'Failed to clear schedule cache:',
      error
    );
  }
}

export function clearAllScheduleCaches() {
  try {
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);

      if (
        key?.startsWith('sh_cached_schedule_') ||
        key?.startsWith('sh_cache_timestamp_')
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error(
      'Failed to clear schedule caches:',
      error
    );
  }
}

/* ============================================================
   RESPONSE NORMALIZATION
   ============================================================ */

export function normalizeScheduleResponse(json) {
  if (
    !json ||
    typeof json !== 'object'
  ) {
    return null;
  }

  const source =
    json.data &&
    typeof json.data === 'object'
      ? json.data
      : null;

  if (!source) {
    return null;
  }

  return {
    ...EMPTY_DATA,
    ...source,

    schedules:
      source.schedules &&
      typeof source.schedules === 'object'
        ? source.schedules
        : {},

    todaySchedules:
      Array.isArray(source.todaySchedules)
        ? source.todaySchedules
        : [],

    exams:
      Array.isArray(source.exams)
        ? source.exams
        : [],

    currentWeek:
      Number(source.currentWeek) || 1,

    nextLesson:
      source.nextLesson || null,

    cached:
      Boolean(json.cached),

    fallback:
      Boolean(json.fallback),

    stale:
      Boolean(json.stale),

    debug:
      json.debug || null
  };
}

/* ============================================================
   DATA CHECKS
   ============================================================ */

export function hasScheduleData(data) {
  if (
    !data ||
    !data.schedules ||
    typeof data.schedules !== 'object'
  ) {
    return false;
  }

  return Object.values(
    data.schedules
  ).some(
    value =>
      Array.isArray(value) &&
      value.length > 0
  );
}

export function hasUsableScheduleData(data) {
  if (!data) {
    return false;
  }

  return (
    hasScheduleData(data) ||
    data.exams?.length > 0 ||
    Boolean(data.studentGroup)
  );
}

/* ============================================================
   STATUS
   ============================================================ */

export function getScheduleStatusMessage(
  state,
  offline = false
) {
  if (offline) {
    return hasScheduleData(state)
      ? 'Device is offline. Showing the latest cached timetable.'
      : 'Device is offline and no cached timetable is available.';
  }

  if (state?.fallback) {
    return 'BSUIR data is temporarily unavailable. No live timetable data was received.';
  }

  if (
    state?.cached ||
    state?.stale
  ) {
    return 'BSUIR is temporarily unavailable. Showing the latest cached timetable.';
  }

  return null;
}

function getApiErrorMessage(
  json,
  status
) {
  return (
    json?.debug?.error ||
    json?.error ||
    json?.message ||
    `Schedule server returned HTTP ${status}.`
  );
}

/* ============================================================
   API
   ============================================================ */

export async function fetchGroupSchedule(
  group,
  subgroup,
  options = {}
) {
  const normalizedGroup =
    normalizeGroup(group);

  if (!normalizedGroup) {
    throw new Error(
      'No student group has been selected.'
    );
  }

  const normalizedSubgroup = [
  '1',
  '2',
  'all'
].includes(String(subgroup))
  ? String(subgroup)
  : '1';

  const signal =
    options.signal;

  const endpoint =
    `/api/bsuir/schedule?group=${encodeURIComponent(
      normalizedGroup
    )}&subgroup=${encodeURIComponent(
      normalizedSubgroup
    )}`;

  const response =
    await fetch(
      endpoint,
      {
        headers: {
          Accept:
            'application/json'
        },
        signal
      }
    );

  let json = null;

  try {
    json =
      await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        json,
        response.status
      )
    );
  }

  if (
    !json ||
    json.success !== true ||
    !json.data
  ) {
    throw new Error(
      json?.debug?.error ||
      'The schedule server returned no timetable data.'
    );
  }

  const data =
    normalizeScheduleResponse(
      json
    );

  if (!data) {
    throw new Error(
      'Invalid schedule response.'
    );
  }

  return {
    data,
    response: json,
    usable:
      hasUsableScheduleData(data)
  };
}

/* ============================================================
   LOAD GROUP SCHEDULE
   ============================================================ */

/*
 * This is the main function App.jsx will use.
 *
 * Important:
 * - cached data is returned immediately when available
 * - live data is still requested unless offline
 * - failed refresh falls back to cached data
 * - UI/status information is returned separately
 */
export async function loadGroupSchedule(
  group,
  subgroup,
  {
    offline = false,
    signal
  } = {}
) {
  const normalizedGroup =
    normalizeGroup(group);

  if (!normalizedGroup) {
    return {
      data: {
        ...EMPTY_DATA
      },
      cache: null,
      lastUpdated: null,
      state: 'error',
      error:
        'No student group has been selected.'
    };
  }

  const cached =
    readCachedSchedule(
      normalizedGroup
    );

  const lastUpdated =
    readCacheTimestamp(
      normalizedGroup
    );

  /*
   * Offline:
   * never make a network request.
   */
  if (offline) {
    return {
      data:
        cached || {
          ...EMPTY_DATA
        },

      cache: cached,

      lastUpdated,

      state:
        cached
          ? 'cached'
          : 'offline',

      error:
        getScheduleStatusMessage(
          cached,
          true
        )
    };
  }

  /*
   * Try live data.
   */
  try {
    const result =
      await fetchGroupSchedule(
        normalizedGroup,
        subgroup,
        { signal }
      );

    const {
      data,
      response,
      usable
    } = result;

    /*
     * If the response contains useful
     * schedule data, replace the cache.
     *
     * If it doesn't, preserve an existing
     * cache rather than destroying good data.
     */
    if (usable) {
      saveCachedSchedule(
        normalizedGroup,
        response
      );

      const timestamp =
        new Date().toISOString();

      let state = 'live';
      let error = null;

      if (response.fallback) {
        state = 'fallback';
        error =
          getScheduleStatusMessage(
            data,
            false
          );
      } else if (
        response.cached ||
        response.stale
      ) {
        state = 'cached';
        error =
          getScheduleStatusMessage(
            data,
            false
          );
      }

      return {
        data,
        cache: cached,
        lastUpdated: timestamp,
        state,
        error
      };
    }

    /*
     * Live response exists but contains
     * no useful timetable data.
     *
     * Prefer existing cache.
     */
    if (cached) {
      return {
        data: cached,
        cache: cached,
        lastUpdated,
        state: 'cached',
        error:
          'The server returned no usable timetable. Showing the last saved timetable.'
      };
    }

    return {
      data,
      cache: null,
      lastUpdated: null,
      state: 'error',
      error:
        'The schedule server returned no usable timetable data.'
    };
  } catch (error) {
    /*
     * Abort is not a real error.
     */
    if (
      error?.name ===
      'AbortError'
    ) {
      throw error;
    }

    console.error(
      'Failed to fetch BSUIR schedule:',
      error
    );

    /*
     * Most important fallback:
     * keep the previous good schedule.
     */
    if (cached) {
      return {
        data: cached,
        cache: cached,
        lastUpdated,
        state: 'cached',
        error:
          'Unable to refresh the timetable. Showing the last saved timetable.'
      };
    }

    return {
      data: {
        ...EMPTY_DATA
      },
      cache: null,
      lastUpdated: null,
      state: 'error',
      error:
        error?.message ||
        'Unable to load the academic timetable.'
    };
  }
}

export { EMPTY_DATA };
