import { resolveLessonsForDate } from "../../src/utils/scheduleResolver.js";

const API = "https://iis.bsuir.by/api/v1";
const CACHE_TTL = 86400;
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
    // Redis failure must never break the timetable.
  }
}

async function fetchJson(url) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, TIMEOUT);

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

  return (
    Number.isInteger(week) &&
    week >= 1 &&
    week <= 4
  )
    ? week
    : null;
}

function mockData(group) {
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
    const start = getMinutes(
      lesson.startLessonTime
    );

    if (
      start !== null &&
      start > currentMinutes
    ) {
      return lesson;
    }
  }

  return null;
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

  const cacheKey =
    `bsuir:schedule:${group}`;

  let liveSchedule = null;
  let liveWeek = null;

  let cached = false;
  let fallback = false;
  let stale = false;

  const debug = {
    group
  };

  /*
   * These requests are intentionally independent.
   *
   * A current-week outage must NOT discard
   * a perfectly good schedule response.
   */
  const schedulePromise = fetchJson(
    `${API}/schedule?studentGroup=${encodeURIComponent(
      group
    )}`
  );

  const weekPromise = fetchJson(
    `${API}/schedule/current-week`
  );

  try {
    const schedule = await schedulePromise;

    if (!hasSchedules(schedule?.schedules)) {
      throw new Error(
        "BSUIR returned no schedule data"
      );
    }

    liveSchedule = schedule;
    debug.schedule = "ok";
  } catch (error) {
    debug.schedule =
      error?.message || String(error);
  }

  try {
    const week = await weekPromise;

    liveWeek = validWeek(week);

    if (!liveWeek) {
      throw new Error(
        "BSUIR returned an invalid current week"
      );
    }

    debug.currentWeek = "ok";
  } catch (error) {
    debug.currentWeek =
      error?.message || String(error);
  }

  /*
   * If we have a live schedule, keep it even when
   * current-week failed. Try Redis only for the
   * missing week in that situation.
   */
  let cachedData = null;

  if (liveSchedule && !liveWeek) {
    cachedData = await redisGet(cacheKey);

    const cachedWeek =
      validWeek(cachedData?.currentWeek);

    if (cachedWeek) {
      liveWeek = cachedWeek;
      debug.currentWeekSource = "redis";
    }
  }

  /*
   * If the live schedule itself failed, Redis becomes
   * the complete fallback source.
   */
  if (!liveSchedule) {
    cachedData = await redisGet(cacheKey);

    if (
      cachedData?.schedule &&
      hasSchedules(
        cachedData.schedule.schedules
      )
    ) {
      liveSchedule =
        cachedData.schedule;

      liveWeek =
        validWeek(
          cachedData.currentWeek
        );

      cached = true;
      stale = true;

      debug.source = "redis";
    }
  }

  /*
   * A schedule without a valid week is still not
   * safe to resolve because weekNumber filtering
   * would be incorrect.
   */
  if (
    !liveSchedule ||
    !hasSchedules(
      liveSchedule.schedules
    ) ||
    !validWeek(liveWeek)
  ) {
    fallback = true;

    return res.status(200).json({
      success: true,
      cached: false,
      fallback: true,
      stale: false,
      debug,
      data: mockData(group)
    });
  }

  /*
   * Only successful live schedule + valid week
   * responses are written to Redis.
   */
  if (!cached) {
    await redisSet(cacheKey, {
      schedule: liveSchedule,
      currentWeek: liveWeek
    });
  }

  const today = new Date();

  const todaySchedules =
    resolveLessonsForDate(
      liveSchedule.schedules,
      today,
      liveWeek,
      1
    );

  const nextLesson =
    getNextLesson(todaySchedules);

  debug.source =
    cached ? "redis" : "bsuir";

  debug.scheduleDays =
    Object.keys(
      liveSchedule.schedules
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
        liveSchedule.schedules,

      todaySchedules,

      exams:
        Array.isArray(
          liveSchedule.exams
        )
          ? liveSchedule.exams
          : [],

      currentWeek: liveWeek,

      nextLesson
    }
  });
}