import {
  useEffect,
  useState
} from 'react';

import {
  EMPTY_DATA,
  loadGroupSchedule,
  readCachedSchedule,
  readCacheTimestamp
} from '../services/scheduleService';


export function useSchedule({
  group,
  subgroup = 1,
  isOffline
}) {
  const normalizedGroup =
    String(group || '').trim();

  const normalizedSubgroup =
    Number(subgroup) || 1;


  const [scheduleData, setScheduleData] =
    useState(() =>
      normalizedGroup
        ? readCachedSchedule(
            normalizedGroup
          ) || {
            ...EMPTY_DATA
          }
        : {
            ...EMPTY_DATA
          }
    );


  const [loading, setLoading] =
    useState(true);

  const [apiError, setApiError] =
    useState(null);

  const [apiState, setApiState] =
    useState('loading');

  const [lastUpdated, setLastUpdated] =
    useState(() =>
      normalizedGroup
        ? readCacheTimestamp(
            normalizedGroup
          )
        : null
    );


  useEffect(() => {
    let cancelled = false;

    const controller =
      new AbortController();


    async function load() {
      if (!normalizedGroup) {
        setScheduleData({
          ...EMPTY_DATA
        });

        setLoading(false);
        setApiState('error');
        setApiError(
          'No student group has been selected.'
        );
        setLastUpdated(null);

        return;
      }


      /*
       * Restore this group's cache immediately.
       *
       * This prevents data from the previous
       * group from remaining on screen while
       * the new group is loading.
       */
      const cached =
        readCachedSchedule(
          normalizedGroup
        );

      if (cancelled) {
        return;
      }

      if (cached) {
        setScheduleData(cached);

        setLastUpdated(
          readCacheTimestamp(
            normalizedGroup
          )
        );
      } else {
        setScheduleData({
          ...EMPTY_DATA
        });

        setLastUpdated(null);
      }


      /*
       * Show loading state only when we are
       * actually allowed to request live data.
       */
      setLoading(!isOffline);

      setApiError(null);

      if (isOffline) {
        setApiState(
          cached
            ? 'cached'
            : 'offline'
        );

        setApiError(
          cached
            ? 'Device is offline. Showing the latest cached timetable.'
            : 'Device is offline and no cached timetable is available.'
        );

        setLoading(false);

        return;
      }


      /*
       * scheduleService owns:
       *
       * - API request
       * - normalization
       * - cache fallback
       * - API status
       * - timestamps
       * - offline handling
       */
      try {
        const result =
          await loadGroupSchedule(
            normalizedGroup,
            normalizedSubgroup,
            {
              offline: false,
              signal:
                controller.signal
            }
          );


        if (cancelled) {
          return;
        }


        setScheduleData(
          result?.data || {
            ...EMPTY_DATA
          }
        );

        setApiState(
          result?.state || 'error'
        );

        setApiError(
          result?.error || null
        );

        setLastUpdated(
          result?.lastUpdated || null
        );

      } catch (error) {
        if (
          cancelled ||
          error?.name ===
            'AbortError'
        ) {
          return;
        }

        console.error(
          'Failed to load BSUIR schedule:',
          error
        );

        /*
         * This should normally already be
         * handled by scheduleService.
         *
         * This is only a final safety net.
         */
        setApiState('error');

        setApiError(
          error?.message ||
            'Unable to load the academic timetable.'
        );

        if (!cached) {
          setScheduleData({
            ...EMPTY_DATA
          });

          setLastUpdated(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }


    load();


    return () => {
      cancelled = true;
      controller.abort();
    };

  }, [
    normalizedGroup,
    normalizedSubgroup,
    isOffline
  ]);


  return {
    scheduleData,
    loading,
    apiError,
    apiState,
    lastUpdated
  };
}


export default useSchedule;