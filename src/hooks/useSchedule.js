import { useEffect, useState } from 'react';

import {
  EMPTY_DATA,
  loadGroupSchedule,
  readCachedSchedule,
  readCacheTimestamp,
  saveCachedSchedule,
  hasScheduleData
} from '../services/scheduleService';


function getStatusMessage(data, offline) {
  if (offline) {
    return hasScheduleData(data)
      ? 'Device is offline. Showing the latest cached timetable.'
      : 'Device is offline and no cached timetable is available.';
  }

  if (data?.fallback) {
    return 'BSUIR data is temporarily unavailable. No live timetable data was received.';
  }

  if (data?.cached || data?.stale) {
    return 'BSUIR is temporarily unavailable. Showing the latest cached timetable.';
  }

  return null;
}


export function useSchedule({
  group,
  subgroup = 1,
  isOffline
}) {
  const [scheduleData, setScheduleData] = useState(
    () =>
      readCachedSchedule(group) ||
      {
        ...EMPTY_DATA
      }
  );

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [apiState, setApiState] = useState('loading');

  const [lastUpdated, setLastUpdated] = useState(
    () => readCacheTimestamp(group)
  );


  useEffect(() => {
    let cancelled = false;

    async function load() {
      const normalizedGroup =
        String(group || '').trim();

      const normalizedSubgroup =
        Number(subgroup) || 1;

      if (!normalizedGroup) {
        setScheduleData({
          ...EMPTY_DATA
        });

        setLastUpdated(null);
        setLoading(false);
        setApiState('error');
        setApiError(
          'No student group has been selected.'
        );

        return;
      }


      /*
       * Always restore this group's cache first.
       *
       * This is important when switching groups:
       * old group data must never remain visible.
       */
      const localCache =
        readCachedSchedule(normalizedGroup);

      if (cancelled) {
        return;
      }

      if (localCache) {
        setScheduleData(localCache);

        setLastUpdated(
          readCacheTimestamp(normalizedGroup)
        );
      } else {
        setScheduleData({
          ...EMPTY_DATA
        });

        setLastUpdated(null);
      }


      /*
       * Offline:
       *
       * cache is the source of truth.
       * Never attempt a network request.
       */
      if (isOffline) {
        if (cancelled) {
          return;
        }

        setLoading(false);

        setApiState(
          localCache
            ? 'cached'
            : 'offline'
        );

        setApiError(
          getStatusMessage(
            localCache,
            true
          )
        );

        return;
      }


      /*
       * Network request.
       */
      try {
        setLoading(true);
        setApiError(null);
        setApiState('loading');


        const response =
          await loadGroupSchedule(
            normalizedGroup,
            normalizedSubgroup
          );


        if (cancelled) {
          return;
        }


        /*
         * scheduleService is responsible for
         * validating and normalizing the API response.
         */
        const data =
          response?.data ||
          response;


        if (
          !data ||
          typeof data !== 'object'
        ) {
          throw new Error(
            'Invalid schedule response.'
          );
        }


        /*
         * If the backend could not provide useful
         * timetable data, keep the existing cache.
         */
        const usable =
          hasScheduleData(data) ||
          (
            Array.isArray(data.exams) &&
            data.exams.length > 0
          ) ||
          Boolean(data.studentGroup);


        if (usable) {
          setScheduleData(data);

          saveCachedSchedule(
            normalizedGroup,
            data
          );

          const timestamp =
            new Date().toISOString();

          setLastUpdated(timestamp);
        } else if (localCache) {
          setScheduleData(localCache);
        } else {
          setScheduleData(data);
        }


        /*
         * API/cache status.
         */
        if (data.fallback) {
          setApiState('fallback');

          setApiError(
            getStatusMessage(
              data,
              false
            )
          );
        } else if (
          data.cached ||
          data.stale
        ) {
          setApiState('cached');

          setApiError(
            getStatusMessage(
              data,
              false
            )
          );
        } else {
          setApiState('live');
          setApiError(null);
        }

      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          'Failed to load BSUIR schedule:',
          error
        );


        /*
         * Network/API failure:
         *
         * NEVER destroy a valid cache.
         */
        if (localCache) {
          setScheduleData(localCache);

          setApiState('cached');

          setApiError(
            'Unable to refresh the timetable. Showing the last saved timetable.'
          );
        } else {
          setApiState('error');

          setApiError(
            error?.message ||
            'Unable to load the academic timetable.'
          );
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
    };

  }, [
    group,
    subgroup,
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
