import { useEffect, useRef } from 'react';
import { subscribeCacheInvalidation } from '../utils/apiCache';

/**
 * Refetch when apiCache prefixes are invalidated after a successful mutation.
 * Prefer this over full-page reloads or blind polling.
 * Debounced to avoid request storms when one mutation clears many prefixes.
 *
 * @param {string|string[]} prefixes - Cache key prefixes to watch (e.g. 'work-orders:')
 * @param {() => void|Promise<void>} onInvalidate
 * @param {boolean} [enabled=true]
 * @param {number} [debounceMs=100]
 */
export function useCacheInvalidation(prefixes, onInvalidate, enabled = true, debounceMs = 100) {
  const callbackRef = useRef(onInvalidate);
  callbackRef.current = onInvalidate;

  const prefixList = Array.isArray(prefixes) ? prefixes : [prefixes];

  useEffect(() => {
    if (!enabled || !prefixList.length) return undefined;

    let timer = null;
    const unsub = subscribeCacheInvalidation(({ prefixes: hit = [] }) => {
      const shouldRun = hit.includes('*') || hit.some((h) =>
        prefixList.some((p) => h === p || h.startsWith(p) || p.startsWith(h)),
      );
      if (!shouldRun) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        Promise.resolve(callbackRef.current?.()).catch((err) => {
          console.error('[useCacheInvalidation] refetch failed:', err);
        });
      }, debounceMs);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [enabled, debounceMs, prefixList.join('|')]);
}
