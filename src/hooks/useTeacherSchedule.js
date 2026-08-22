import { useEffect, useState } from 'react';

import {
  fetchTeacherSchedule
} from '../services/scheduleService';

const EMPTY_STATE = {
  data: null,
  loading: false,
  error: null
};

export function useTeacherSchedule(
  urlId,
  {
    enabled = true
  } = {}
) {
  const [
    state,
    setState
  ] = useState(
    EMPTY_STATE
  );

  useEffect(() => {
    const normalizedUrlId =
      String(
        urlId || ''
      ).trim();

    if (
      !enabled ||
      !normalizedUrlId
    ) {
      setState(
        EMPTY_STATE
      );

      return undefined;
    }

    const controller =
      new AbortController();

    let cancelled = false;

    async function loadTeacherSchedule() {
      setState({
        data: null,
        loading: true,
        error: null
      });

      try {
        const result =
          await fetchTeacherSchedule(
            normalizedUrlId,
            {
              signal:
                controller.signal
            }
          );

        if (
          cancelled ||
          controller.signal.aborted
        ) {
          return;
        }

        setState({
          data:
            result.data,
          loading: false,
          error: null
        });
      } catch (error) {
        if (
          cancelled ||
          error?.name ===
            'AbortError'
        ) {
          return;
        }

        console.error(
          'Failed to load teacher schedule:',
          error
        );

        setState({
          data: null,
          loading: false,
          error:
            error?.message ||
            'Unable to load teacher schedule.'
        });
      }
    }

    loadTeacherSchedule();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    urlId,
    enabled
  ]);

  return {
    data:
      state.data,
    loading:
      state.loading,
    error:
      state.error,
    hasData:
      Boolean(state.data)
  };
}