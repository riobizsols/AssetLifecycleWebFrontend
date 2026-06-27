import { useEffect, useRef } from 'react';

/**
 * Industry-standard "refetch on window focus" (used by React Query, SWR, etc.)
 */
export function useRevalidateOnFocus(callback, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const revalidate = () => {
      callbackRef.current?.();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        revalidate();
      }
    };

    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled]);
}
