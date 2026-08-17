import {
  resolveLessonsForDate,
  getNextLesson
} from "../../src/utils/scheduleResolver.js";

import {
  validateStudentGroup
} from "./groups.js";

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

    const result = await response.json();

    if (!result.result) {
      return null;
    }

    return JSON.parse(result.result);
  } catch {
    return null;
  }
}

async function redisSet(key, value) {
  const { url, token } = redisConfig();

  if (!url || !token) {
    return false;
  }

  try {
    const encoded = encodeURIComponent(
      JSON.stringify(value)
    );

    const response = await fetch(
      `${url}/set/${encodeURIComponent(
        key
      )}/${encoded}?ex=${CACHE_TTL}`,
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

async function fetchJson(url) {
  const controller =
    new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT
  );

  try {
    const response = await fetch(
      url,
      {
        signal: controller.signal,
        headers: {
          Accept:
            "application/json, text/plain, */*",
          "User-Agent":
            "ScheduleHub/1.0"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
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

  return Object.values(
    schedules
  ).some(
    value =>
      Array.isArray(value) &&
      value.length > 0
  );
}

function getActualSchedules(
  scheduleData
) {
  if (
    !scheduleData ||
    typeof scheduleData !== "object"
  ) {
    return {};
  }

  if (
    hasSchedules(
      scheduleData.schedules
    )
  ) {
    return scheduleData.schedules;
  }

  if (
    hasSchedules(
      scheduleData.nextSchedules
    )
  ) {
    return scheduleData.nextSchedules;
  }

  if (
    hasSchedules(
      scheduleData.previousSchedules
    )
  ) {
    return scheduleData.previousSchedules;
  }

  return {};
}

function validWeek(value) {
  const week = Number(value);

  return Number.isInteger(week) &&
    week >= 1 &&
    week <= 4
    ? week
    : null;
}

function extractCurrentWeek(value) {
  if (
    value &&
    typeof value === "object"
  ) {
    return validWeek(
      value.currentWeek ??
      value.week ??
      value.weekNumber ??
      value.value
    );
  }

  return validWeek(value);
}

function normalizeSubgroup(value) {
  const raw =
    String(value ?? "all")
      .trim()
      .toLowerCase();

  if (raw === "1") {
    return 1;
  }

  if (raw === "2") {
    return 2;
  }

  return "all";
}

function fallbackData(
  studentGroup,
  currentWeek
) {
  return {
    studentGroup,
    schedules: {},
    todaySchedules: [],
    exams: [],
    currentWeek:
      currentWeek || 1,
    nextLesson: null
  };
}

export default async function handler(
  req,
  res
) {
  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );

  const requestedGroup =
    typeof req.query.group === "string"
      ? req.query.group.trim()
      : "";

  if (!requestedGroup) {
    return res.status(400).json({
      success: false,
      cached: false,
      fallback: false,
      stale: false,
      debug: {
        error:
          "Missing group parameter"
      },
      data: null
    });
  }

  const subgroup =
    normalizeSubgroup(
      req.query.subgroup
    );

  const groupResult =
    await validateStudentGroup(
      requestedGroup
    );

  if (!groupResult.valid) {
    return res.status(400).json({
      success: false,
      cached:
        groupResult.cached,
      fallback: false,
      stale:
        groupResult.stale,
      debug: {
        error:
          groupResult.reason,
        requestedGroup,
        groupSource:
          groupResult.cached
            ? "redis"
            : "bsuir"
      },
      data: null
    });
  }

  const studentGroup =
    String(
      groupResult.group?.name ||
      requestedGroup
    ).trim();

  const scheduleKey =
    `bsuir:schedule:${studentGroup}`;

  const weekKey =
    "bsuir:current-week";

  const debug = {
    group: studentGroup,
    requestedGroup,
    subgroup,
    scheduleSource: null,
    weekSource: null,
    groupSource:
      groupResult.cached
        ? "redis"
        : "bsuir"
  };

  let scheduleData = null;
  let currentWeek = null;

  let scheduleCached = false;
  let weekCached = false;

  const results =
    await Promise.allSettled([
      fetchJson(
        `${API}/schedule?studentGroup=${encodeURIComponent(
          studentGroup
        )}`
      ),
      fetchJson(
        `${API}/schedule/current-week`
      )
    ]);

  const scheduleResult =
    results[0];

  const weekResult =
    results[1];

  if (
    scheduleResult.status ===
      "fulfilled"
  ) {
    const actualSchedules =
      getActualSchedules(
        scheduleResult.value
      );

    if (
      hasSchedules(
        actualSchedules
      )
    ) {
      scheduleData = {
        ...scheduleResult.value,
        schedules:
          actualSchedules
      };

      debug.scheduleSource =
        scheduleResult.value
          .schedules &&
        hasSchedules(
          scheduleResult.value
            .schedules
        )
          ? "bsuir"
          : scheduleResult.value
                .nextSchedules &&
            hasSchedules(
              scheduleResult.value
                .nextSchedules
            )
            ? "bsuir-next"
            : "bsuir-previous";
    } else {
      debug.scheduleSource =
        "bsuir-empty";
    }
  } else {
    debug.scheduleSource =
      "bsuir-error";
  }

  if (
    weekResult.status ===
    "fulfilled"
  ) {
    currentWeek =
      extractCurrentWeek(
        weekResult.value
      );
  }

  if (currentWeek) {
    debug.weekSource =
      "bsuir";
  } else {
    debug.weekSource =
      weekResult.status ===
      "rejected"
        ? "bsuir-error"
        : "bsuir-invalid";
  }

  if (!scheduleData) {
    const cachedSchedule =
      await redisGet(
        scheduleKey
      );

    const actualCachedSchedules =
      getActualSchedules(
        cachedSchedule
      );

    if (
      hasSchedules(
        actualCachedSchedules
      )
    ) {
      scheduleData = {
        ...cachedSchedule,
        schedules:
          actualCachedSchedules
      };

      scheduleCached = true;

      debug.scheduleSource =
        cachedSchedule?.schedules &&
        hasSchedules(
          cachedSchedule.schedules
        )
          ? "redis"
          : cachedSchedule?.nextSchedules &&
            hasSchedules(
              cachedSchedule
                .nextSchedules
            )
          ? "redis-next"
          : "redis-previous";
    }
  }

  if (!currentWeek) {
    const cachedWeek =
      await redisGet(
        weekKey
      );

    currentWeek =
      extractCurrentWeek(
        cachedWeek
      );

    if (currentWeek) {
      weekCached = true;

      debug.weekSource =
        "redis";
    }
  }

  const actualSchedules =
    getActualSchedules(
      scheduleData
    );

  if (
    !scheduleData ||
    !hasSchedules(
      actualSchedules
    ) ||
    !currentWeek
  ) {
    return res.status(200).json({
      success: true,
      cached:
        scheduleCached ||
        weekCached,
      fallback: true,
      stale:
        scheduleCached ||
        weekCached,
      debug: {
        ...debug,
        source:
          scheduleCached ||
          weekCached
            ? "redis"
            : "fallback"
      },
      data: fallbackData(
        studentGroup,
        currentWeek
      )
    });
  }

  if (!scheduleCached) {
    await redisSet(
      scheduleKey,
      scheduleData
    );
  }

  if (
    !weekCached &&
    currentWeek
  ) {
    await redisSet(
      weekKey,
      {
        currentWeek
      }
    );
  }

  const cached =
    scheduleCached ||
    weekCached;

  const stale =
    scheduleCached ||
    weekCached;

  const now =
    new Date();

  const todaySchedules =
    resolveLessonsForDate(
      actualSchedules,
      now,
      currentWeek,
      subgroup,
      {
        referenceDate: now
      }
    );

  const nextLesson =
    getNextLesson(
      actualSchedules,
      now,
      null,
      subgroup,
      currentWeek,
      now
    );

  return res.status(200).json({
    success: true,
    cached,
    fallback: false,
    stale,
    debug: {
      ...debug,
      source: cached
        ? "redis"
        : "bsuir"
    },
    data: {
      studentGroup,
      schedules:
        actualSchedules,
      todaySchedules,
      exams:
        Array.isArray(
          scheduleData.exams
        )
          ? scheduleData.exams
          : [],
      currentWeek,
      nextLesson
    }
  });
}