import { useEffect, useState } from 'react';

const CACHE_KEY =
  'sh_cached_teachers';

const TIMESTAMP_KEY =
  'sh_teachers_cache_timestamp';

const EMPTY_STATE = {
  teachers: [],
  loading: true,
  error: null,
  cached: false
};

function readCachedTeachers() {
  try {
    const value =
      localStorage.getItem(
        CACHE_KEY
      );

    if (!value) {
      return null;
    }

    const parsed =
      JSON.parse(value);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(
        parsed.teachers
      )
    ) {
      return null;
    }

    return {
      teachers:
        parsed.teachers,
      cached: true
    };
  } catch (error) {
    console.error(
      'Failed to read cached teachers:',
      error
    );

    return null;
  }
}

function readCacheTimestamp() {
  try {
    return localStorage.getItem(
      TIMESTAMP_KEY
    );
  } catch {
    return null;
  }
}

function saveCachedTeachers(
  teachers
) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        teachers
      })
    );

    localStorage.setItem(
      TIMESTAMP_KEY,
      new Date().toISOString()
    );
  } catch (error) {
    console.error(
      'Failed to save teachers cache:',
      error
    );
  }
}

export function clearTeachersCache() {
  try {
    localStorage.removeItem(
      CACHE_KEY
    );

    localStorage.removeItem(
      TIMESTAMP_KEY
    );
  } catch (error) {
    console.error(
      'Failed to clear teachers cache:',
      error
    );
  }
}

export function useTeachers({
  isOffline = false
} = {}) {
  const [
    state,
    setState
  ] = useState(() => {
    const cached =
      readCachedTeachers();

    if (!cached) {
      return EMPTY_STATE;
    }

    return {
      ...EMPTY_STATE,
      teachers:
        cached.teachers,
      loading: false,
      cached: true
    };
  });

  const [
    lastUpdated,
    setLastUpdated
  ] = useState(
    readCacheTimestamp
  );

  useEffect(() => {
    let cancelled = false;

    async function loadTeachers() {
      const cached =
        readCachedTeachers();

      if (cached) {
        setState({
          teachers:
            cached.teachers,
          loading: false,
          error: null,
          cached: true
        });

        setLastUpdated(
          readCacheTimestamp()
        );
      }

      if (isOffline) {
        if (!cancelled) {
          setState({
            teachers:
              cached?.teachers || [],
            loading: false,
            error: cached
              ? 'Device is offline. Showing the latest cached teachers.'
              : 'Device is offline and no cached teachers are available.',
            cached: Boolean(
              cached
            )
          });
        }

        return;
      }

      try {
        if (!cached) {
          setState(
            previous => ({
              ...previous,
              loading: true,
              error: null
            })
          );
        }

        const response =
          await fetch(
            '/api/bsuir/teacher',
            {
              headers: {
                Accept:
                  'application/json'
              }
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
            json?.error ||
              json?.message ||
              `Teacher server returned HTTP ${response.status}.`
          );
        }

        if (
          !json ||
          json.success !== true ||
          !json.data ||
          !Array.isArray(
            json.data.teachers
          )
        ) {
          throw new Error(
            'The teacher server returned invalid data.'
          );
        }

        if (cancelled) {
          return;
        }

        const teachers =
          json.data.teachers;

        setState({
          teachers,
          loading: false,
          error: null,
          cached: Boolean(
            json.cached
          )
        });

        saveCachedTeachers(
          teachers
        );

        setLastUpdated(
          new Date().toISOString()
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          'Failed to fetch BSUIR teachers:',
          error
        );

        if (cached) {
          setState({
            teachers:
              cached.teachers,
            loading: false,
            error:
              'Unable to refresh teachers. Showing the last saved teacher directory.',
            cached: true
          });

          setLastUpdated(
            readCacheTimestamp()
          );
        } else {
          setState({
            teachers: [],
            loading: false,
            error:
              error?.message ||
              'Unable to load BSUIR teachers.',
            cached: false
          });
        }
      }
    }

    loadTeachers();

    return () => {
      cancelled = true;
    };
  }, [isOffline]);

  return {
    teachers:
      state.teachers,
    loading:
      state.loading,
    error:
      state.error,
    cached:
      state.cached,
    lastUpdated
  };
}