const API = "https://iis.bsuir.by/api/v1/student-groups";
const CACHE_TTL = 86400;
const CACHE_KEY = "bsuir:student-groups";
const TIMEOUT = 10000;

function redisConfig() {
  return {
    url:
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL,
    token:
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN
  };
}

async function redisGet(key) {
  const { url, token } = redisConfig();

  if (!url || !token) return null;

  try {
    const response = await fetch(
      `${url}/get/${encodeURIComponent(key)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) return null;

    const result = await response.json();

    if (!result.result) return null;

    return JSON.parse(result.result);
  } catch {
    return null;
  }
}

async function redisSet(key, value) {
  const { url, token } = redisConfig();

  if (!url || !token) return false;

  try {
    const encoded = encodeURIComponent(
      JSON.stringify(value)
    );

    const response = await fetch(
      `${url}/set/${encodeURIComponent(key)}/${encoded}?ex=${CACHE_TTL}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

async function fetchGroups() {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT
  );

  try {
    const response = await fetch(API, {
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "ScheduleHub/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(
        `BSUIR groups API returned HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(
        "BSUIR groups API returned no groups"
      );
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeGroup(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function findGroup(groups, requestedGroup) {
  const target = normalizeGroup(requestedGroup);

  if (!target) return null;

  return (
    groups.find(group => {
      return (
        normalizeGroup(group?.name) === target
      );
    }) || null
  );
}

export async function getStudentGroups() {
  try {
    const liveGroups = await fetchGroups();

    if (Array.isArray(liveGroups) && liveGroups.length) {
      await redisSet(
        CACHE_KEY,
        liveGroups
      );

      return {
        groups: liveGroups,
        cached: false,
        stale: false
      };
    }
  } catch {
    // Fall through to Redis.
  }

  const cachedGroups =
    await redisGet(CACHE_KEY);

  if (
    Array.isArray(cachedGroups) &&
    cachedGroups.length
  ) {
    return {
      groups: cachedGroups,
      cached: true,
      stale: true
    };
  }

  return {
    groups: [],
    cached: false,
    stale: false
  };
}

export async function validateStudentGroup(
  requestedGroup
) {
  const normalized =
    normalizeGroup(requestedGroup);

  if (!normalized) {
    return {
      valid: false,
      group: null,
      cached: false,
      stale: false,
      reason: "missing_group"
    };
  }

  const result =
    await getStudentGroups();

  const group = findGroup(
    result.groups,
    normalized
  );

  if (!group) {
    return {
      valid: false,
      group: null,
      cached: result.cached,
      stale: result.stale,
      reason: "group_not_found"
    };
  }

  return {
    valid: true,
    group,
    cached: result.cached,
    stale: result.stale,
    reason: null
  };
}