const API =
  'https://iis.bsuir.by/api/v1';

const TIMEOUT = 10000;

function createTimeoutSignal() {
  const controller =
    new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT
  );

  return {
    signal: controller.signal,
    cleanup: () =>
      clearTimeout(timer)
  };
}

async function fetchJson(url) {
  const {
    signal,
    cleanup
  } = createTimeoutSignal();

  try {
    const response =
      await fetch(url, {
        signal,
        headers: {
          Accept:
            'application/json, text/plain, */*',
          'User-Agent':
            'ScheduleHub/1.0'
        }
      });

    if (!response.ok) {
      throw new Error(
        `BSUIR returned HTTP ${response.status}.`
      );
    }

    return await response.json();
  } finally {
    cleanup();
  }
}

function hasSchedules(schedules) {
  if (
    !schedules ||
    typeof schedules !== 'object'
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

/*
 * Swift's Employee.Schedule.actualSchedule
 * uses this priority:
 *
 * schedules
 * → nextSchedules
 * → previousSchedules
 */
function getActualSchedules(schedule) {
  if (
    !schedule ||
    typeof schedule !== 'object'
  ) {
    return {};
  }

  if (
    hasSchedules(
      schedule.schedules
    )
  ) {
    return schedule.schedules;
  }

  if (
    hasSchedules(
      schedule.nextSchedules
    )
  ) {
    return schedule.nextSchedules;
  }

  if (
    hasSchedules(
      schedule.previousSchedules
    )
  ) {
    return schedule.previousSchedules;
  }

  return {};
}

export default async function handler(
  req,
  res
) {
  if (req.method !== 'GET') {
    res.setHeader(
      'Allow',
      'GET'
    );

    return res.status(405).json({
      success: false,
      error:
        'Method not allowed.'
    });
  }

  res.setHeader(
    'Cache-Control',
    's-maxage=3600, stale-while-revalidate=86400'
  );

  const urlId =
    typeof req.query.urlId ===
    'string'
      ? req.query.urlId.trim()
      : '';

  if (!urlId) {
    return res.status(400).json({
      success: false,
      error:
        'Missing teacher urlId.'
    });
  }

  try {
    const schedule =
      await fetchJson(
        `${API}/employees/schedule/${encodeURIComponent(
          urlId
        )}`
      );

    if (
      !schedule ||
      typeof schedule !== 'object'
    ) {
      throw new Error(
        'BSUIR returned invalid teacher schedule data.'
      );
    }

    const schedules =
      getActualSchedules(
        schedule
      );

    return res.status(200).json({
      success: true,
      cached: false,
      fallback: false,
      stale: false,

      data: {
        ...schedule,

        schedules,

        previousSchedules:
          schedule.previousSchedules ||
          {},

        nextSchedules:
          schedule.nextSchedules ||
          {},

        exams:
          Array.isArray(
            schedule.exams
          )
            ? schedule.exams
            : [],

        startDate:
          schedule.startDate ||
          null,

        endDate:
          schedule.endDate ||
          null,

        startExamsDate:
          schedule.startExamsDate ||
          null,

        endExamsDate:
          schedule.endExamsDate ||
          null
      }
    });
  } catch (error) {
    console.error(
      'Failed to fetch BSUIR teacher schedule:',
      error
    );

    return res.status(502).json({
      success: false,
      cached: false,
      fallback: false,
      stale: false,

      error:
        error?.message ||
        'Unable to load BSUIR teacher schedule.',

      data: null
    });
  }
}