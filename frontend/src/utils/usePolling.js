import { useEffect, useRef } from 'react';

/**
 * usePolling - Polls a data-fetching function at a set interval,
 * calling `setter` with the result on each tick.
 * 
 * @param {Function} fetchFn - async function that returns data
 * @param {Function} setter  - state setter to call with the result
 * @param {number} intervalMs - polling interval in ms (default: 15000 = 15s)
 * @param {boolean} enabled  - whether polling is active (default: true)
 */
export function usePolling(fetchFn, setter, intervalMs = 15000, enabled = true) {
  const savedFn = useRef(fetchFn);
  const savedSetter = useRef(setter);

  // Keep refs up to date
  useEffect(() => { savedFn.current = fetchFn; }, [fetchFn]);
  useEffect(() => { savedSetter.current = setter; }, [setter]);

  useEffect(() => {
    if (!enabled) return;

    // Run immediately on mount
    const run = async () => {
      try {
        const data = await savedFn.current();
        if (data != null) savedSetter.current(data);
      } catch (err) {
        // Silently ignore polling errors (don't flash UI errors on background polls)
        console.debug('[usePolling] fetch error:', err?.message);
      }
    };

    run();
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
