import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribe } from '../storage/db';

/** Re-runs loader whenever any DB write happens (debounced) or deps change. */
export function useLive<T>(loader: () => Promise<T>, deps: unknown[] = []): { data: T | undefined; reload: () => void; loading: boolean } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loaderRef
      .current()
      .then((v) => {
        if (alive) {
          setData(v);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setTick((t) => t + 1), 120);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { data, reload, loading };
}
