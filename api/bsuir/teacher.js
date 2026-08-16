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
    cleanup: () => clearTimeout(timer)
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

function normalizeTeacher(teacher) {
  if (
    !teacher ||
    typeof teacher !== 'object'
  ) {
    return null;
  }

  const firstName =
    String(
      teacher.firstName || ''
    ).trim();

  const middleName =
    teacher.middleName
      ? String(
          teacher.middleName
        ).trim()
      : null;

  const lastName =
    String(
      teacher.lastName || ''
    ).trim();

  const name = [
    firstName,
    middleName,
    lastName
  ]
    .filter(Boolean)
    .join(' ');

  const compactName = [
    lastName,
    firstName
      ? firstName.charAt(0)
      : '',
    middleName
      ? middleName.charAt(0)
      : ''
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id:
      teacher.id ?? null,

    urlId:
      teacher.urlId || null,

    firstName,

    middleName,

    lastName,

    name,

    compactName,

    rank:
      teacher.rank || null,

    degree:
      teacher.degree || null,

    academicDepartment:
      Array.isArray(
        teacher.academicDepartment
      )
        ? teacher.academicDepartment
        : [],

    photoLink:
      teacher.photoLink || null
  };
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

  try {
    const response =
      await fetchJson(
        `${API}/employees/all`
      );

    if (
      !Array.isArray(response)
    ) {
      throw new Error(
        'BSUIR returned an invalid teachers response.'
      );
    }

    const teachers =
      response
        .map(normalizeTeacher)
        .filter(Boolean);

    return res.status(200).json({
      success: true,
      cached: false,
      fallback: false,
      stale: false,
      data: {
        teachers
      }
    });
  } catch (error) {
    console.error(
      'Failed to fetch BSUIR teachers:',
      error
    );

    return res.status(502).json({
      success: false,
      cached: false,
      fallback: false,
      stale: false,
      error:
        error?.message ||
        'Unable to load BSUIR teachers.',
      data: {
        teachers: []
      }
    });
  }
}