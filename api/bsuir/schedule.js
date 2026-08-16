import {
  resolveLessonsForDate,
  normalizeLesson
} from "../../src/utils/scheduleResolver.js";

const API = "https://iis.bsuir.by/api/v1";
const CACHE_TTL = 86400;

function getRedisConfig() {
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
  const { url, token } = getRedisConfig();

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

    const data = await response.json();

    if (!data.result) return null;

    return JSON.parse(data.result);
  } catch {
    return null;
  }
}

async function redisSet(key, value) {
  const { url, token } = getRedisConfig();

  if (!url || !token) return;

  try {
    const encoded = encodeURIComponent(
      JSON.stringify(value)
    );

    await fetch(
      `${url}/set/${encodeURIComponent(key)}/${encoded}?ex=${CACHE_TTL}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
  } catch {
    // Cache failure must never break the timetable.
  }
}

async function fetchJson(url) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "ScheduleHub/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function hasSchedules(schedules) {
  if (
    !schedules ||
    typeof schedules !== "object"
  ) {
    return false;
  }

  return Object.values(schedules).some(
    value =>
      Array.isArray(value) &&
      value.length > 0
  );
}

function getMockData(group) {
  return {
    studentGroup: group,
    schedules: {},
    todaySchedules: [],
    exams: [],
    currentWeek: 1,
    nextLesson: null
  };
}

function getMinutes(time) {
  const match = String(time || "").match(
    /^(\d{1,2}):(\d{2})/
  );

  if (!match) return null;

  return (
    Number(match[1]) * 60 +
    Number(match[2])
  );
}

function getNextLesson(lessons) {
  const now = new Date();

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  for (const lesson of lessons) {
    const normalized =
      normalizeLesson(lesson);

    const start = getMinutes(
      normalized.startLessonTime
    );

    const end = getMinutes(
      normalized.endLessonTime
    );

    if (start === null) continue;

    if (
      currentMinutes < start ||
      (end !== null &&
        currentMinutes < end)
    ) {
      return normalized;
    }
  }

  return null;
}

export default async function handler(
  req,
  res
) {
  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );

  const group =
    typeof req.query.group === "string"
      ? req.query.group.trim()
      : "";

  if (!group) {
    return res.status(400).json({
      success: false,
      error:
        "Missing required group parameter"
    });
  }

  const cacheKey =
    `bsuir:schedule:${group}`;

  let scheduleResponse = null;
  let currentWeek = null;

  let cached = false;
  let fallback = false;
  let stale = false;

  const debug = {};

  /*
   * Fetch both official BSUIR endpoints
   * independently.
   */
  try {
    const [schedule, week] =
      await Promise.all([
        fetchJson(
          `${API}/schedule?studentGroup=${encodeURIComponent(
            group
          )}`
        ),
        fetchJson(
          `${API}/schedule/current-week`
        )
      ]);

    if (!hasSchedules(schedule?.schedules)) {
      throw new Error(
        "BSUIR returned an empty schedules object"
      );
    }

    if (
      !Number.isInteger(week) ||
      week < 1 ||
      week > 4
    ) {
      throw new Error(
        "BSUIR returned an invalid current week"
      );
    }

    scheduleResponse = schedule;
    currentWeek = week;

    await redisSet(cacheKey, {
      schedule: scheduleResponse,
      currentWeek
    });

    debug.source = "bsuir";
  } catch (error) {
    debug.liveError =
      error?.message || String(error);
  }

  /*
   * Live request failed:
   * use Redis if it contains a real schedule.
   */
  if (
    !scheduleResponse ||
    !hasSchedules(
      scheduleResponse.schedules
    )
  ) {
    const cachedData =
      await redisGet(cacheKey);

    if (
      cachedData?.schedule &&
      hasSchedules(
        cachedData.schedule.schedules
      ) &&
      Number.isInteger(
        cachedData.currentWeek
      )
    ) {
      scheduleResponse =
        cachedData.schedule;

      currentWeek =
        cachedData.currentWeek;

      cached = true;
      stale = true;

      debug.source = "redis";
    }
  }

  /*
   * Nothing usable anywhere.
   */
  if (
    !scheduleResponse ||
    !hasSchedules(
      scheduleResponse.schedules
    ) ||
    !Number.isInteger(currentWeek)
  ) {
    fallback = true;

    return res.status(200).json({
      success: true,
      cached: false,
      fallback: true,
      stale: false,
      debug,
      data: getMockData(group)
    });
  }

  /*
   * Resolve today's lessons using:
   *   real calendar date
   *   Russian weekday
   *   current rotation week
   *   subgroup
   */
  const today =
    new Date();

  const todaySchedules =
    resolveLessonsForDate(
      scheduleResponse.schedules,
      today,
      currentWeek,
      1
    );

  const nextLesson =
    getNextLesson(
      todaySchedules
    );

  debug.studentGroup =
    scheduleResponse
      ?.studentGroupDto
      ?.name || group;

  debug.scheduleDays =
    Object.keys(
      scheduleResponse.schedules
    ).length;

  return res.status(200).json({
    success: true,
    cached,
    fallback,
    stale,
    debug,
    data: {
      studentGroup: group,

      schedules:
        scheduleResponse.schedules,

      todaySchedules,

      exams:
        Array.isArray(
          scheduleResponse.exams
        )
          ? scheduleResponse.exams
          : [],

      currentWeek,

      nextLesson
    }
  });
}