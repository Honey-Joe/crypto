import { useCallback, useEffect, useMemo, useState } from 'react';
import { HISTORY_LIMIT, HISTORY_STORAGE_KEY } from '../utils/constants';
import { readJson, writeJson } from '../utils/storage';
import { BenchmarkHistoryContext } from './contexts';

function loadRuns() {
  const stored = readJson(HISTORY_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored.filter((run) => run && run.runId && Array.isArray(run.results)) : [];
}

/**
 * Benchmark history kept in this browser's localStorage (newest first). Only real results
 * returned by the API are stored; nothing is ever generated client-side.
 */
export default function BenchmarkHistoryProvider({ children }) {
  const [runs, setRuns] = useState(loadRuns);
  const [persisted, setPersisted] = useState(true);

  useEffect(() => {
    // If storage is full, drop the oldest runs until the history fits.
    let toStore = runs;
    let ok = writeJson(HISTORY_STORAGE_KEY, toStore);
    while (!ok && toStore.length > 1) {
      toStore = toStore.slice(0, -1);
      ok = writeJson(HISTORY_STORAGE_KEY, toStore);
    }
    setPersisted(ok);
  }, [runs]);

  const addRun = useCallback((run) => {
    setRuns((current) => [run, ...current.filter((existing) => existing.runId !== run.runId)].slice(0, HISTORY_LIMIT));
  }, []);

  const removeRun = useCallback((runId) => {
    setRuns((current) => current.filter((run) => run.runId !== runId));
  }, []);

  const clearRuns = useCallback(() => setRuns([]), []);

  const value = useMemo(
    () => ({ runs, latestRun: runs[0] ?? null, addRun, removeRun, clearRuns, persisted }),
    [runs, addRun, removeRun, clearRuns, persisted],
  );
  return <BenchmarkHistoryContext.Provider value={value}>{children}</BenchmarkHistoryContext.Provider>;
}
