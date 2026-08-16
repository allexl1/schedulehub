import { resolveLessonsForDate } from "../../src/utils/scheduleResolver.js";

const API = "https://iis.bsuir.by/api/v1";
const TIMEOUT = 10000;
const CACHE_TTL = 86400;

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

    const json = await response.json();

    if (!json.result) return null;

    return JSON.parse(json.result);
  } catch {
    return null;
  }
}

async function redisSet(key, value) {
  const { url, token } = redisConfig();

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
    // Cache failures must never break the API.
  }
}

async function fetchJson(url) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT
  );

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
    clearTimeout(timer);
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

function validWeek(value) {
  const week = Number(value);

  if (
    Number.isInteger(week) &&
    week >= 1 &&
    week <= 4
  ) {
    return week;
  }

  return null;
}

function getStartMinutes(lesson) {
  const value =
    lesson?.startLessonTime || "";

  const match = String(value).match(
    /^(\d{1,2}):(\d{2})/
  );

  if (!match) return Number.MAX_SAFE_INTEGER;

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

  return (
    lessons.find(
      lesson =>
        getStartMinutes(lesson) >
        currentMinutes
    ) || null
  );
}

function fallbackData(group) {
  return {
    studentGroup: group,
    schedules: {},
    todaySchedules: [],
    exams: [],
    currentWeek: 1,
    nextLesson: null
  };
}

export default async function handler(req, res) {
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
      error: "Missing required group parameter"
    });
  }

  const scheduleKey =
    `bsuir:schedule:${group}`;

  const weekKey =
    "bsuir:current-week";

  const debug = {
    group,
    schedule: null,
    currentWeek: null,
    source: null
  };

  let schedule = null;
  let currentWeek = null;

  let cached = false;
  let fallback = false;
  let stale = false;

  /*
   * Fetch both endpoints independently.
   * A failure of one must not destroy the other.
   */
  const [scheduleResult, weekResult] =
    await Promise.allSettled([
      fetchJson(
        `${API}/schedule?studentGroup=${encodeURIComponent(group)}`
      ),
      fetchJson(
        `${API}/schedule/current-week`
      )
    ]);

  /*
   * Live schedule.
   */
  if (
    scheduleResult.status === "fulfilled" &&
    hasSchedules(
      scheduleResult.value?.schedules
    )
  ) {
    schedule = scheduleResult.value;
    debug.schedule = "ok";
  } else {
    debug.schedule =
      scheduleResult.status === "rejected"
        ? scheduleResult.reason?.message ||
          String(scheduleResult.reason)
        : "BSUIR returned no schedule data";
  }

  /*
   * Live current rotation week.
   */
  if (
    weekResult.status === "fulfilled"
  ) {
    currentWeek = validWeek(
      weekResult.value
    );
  }

  if (currentWeek) {
    debug.currentWeek = "ok";
  } else {
    debug.currentWeek =
      weekResult.status === "rejected"
        ? weekResult.reason?.message ||
          String(weekResult.reason)
        : "BSUIR returned an invalid current week";
  }

  /*
   * If the live schedule failed, recover it
   * from Redis.
   */
  if (!schedule) {
    const cachedSchedule =
      await redisGet(scheduleKey);

    if (
      cachedSchedule &&
      hasSchedules(
        cachedSchedule.schedules
      )
    ) {
      schedule = cachedSchedule;
      cached = true;
      stale = true;
      debug.source = "redis-schedule";
    }
  }

  /*
   * If the live current-week request failed,
   * recover the week independently from Redis.
   */
  if (!currentWeek) {
    const cachedWeek =
      await redisGet(weekKey);

    const recoveredWeek =
      validWeek(
        cachedWeek?.currentWeek ??
        cachedWeek
      );

    if (recoveredWeek) {
      currentWeek = recoveredWeek;
      cached = true;
      stale = true;
      debug.currentWeekSource =
        "redis";
    }
  }

  /*
   * We cannot safely resolve rotating lessons
   * without both schedule data and a valid week.
   */
  if (
    !schedule ||
    !hasSchedules(
      schedule.schedules
    ) ||
    !currentWeek
  ) {
    fallback = true;
    debug.source = "fallback";

    return res.status(200).json({
      success: true,
      cached: false,
      fallback: true,
      stale: false,
      debug,
      data: fallbackData(group)
    });
  }

  /*
   * Cache only real schedule data.
   */
  if (!cached) {
    await redisSet(
      scheduleKey,
      schedule
    );
  }

  /*
   * Cache the current week independently.
   */
  if (
    weekResult.status === "fulfilled" &&
    validWeek(weekResult.value)
  ) {
    await redisSet(
      weekKey,
      {
        currentWeek
      }
    );
  }

  const today = new Date();

  const todaySchedules =
    resolveLessonsForDate(
      schedule.schedules,
      today,
      currentWeek,
      1
    );

  const nextLesson =
    getNextLesson(
      todaySchedules
    );

  if (!debug.source) {
    debug.source =
      cached ? "redis" : "bsuir";
  }

  debug.scheduleDays =
    Object.keys(
      schedule.schedules
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
        schedule.schedules,

      todaySchedules,

      exams:
        Array.isArray(schedule.exams)
          ? schedule.exams
          : [],

      currentWeek,

      nextLesson
    }
  });
}