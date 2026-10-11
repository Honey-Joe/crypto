import { useCallback, useEffect, useState } from 'react';
import { getHealth } from '../services/systemService';

const POLL_INTERVAL_MS = 30000;

/** Polls GET /health so the header can show whether the API is reachable. */
export default function useBackendHealth() {
  const [status, setStatus] = useState({ state: 'checking', checkedAt: null });

  const check = useCallback(async () => {
    try {
      await getHealth();
      setStatus({ state: 'online', checkedAt: new Date() });
    } catch {
      setStatus({ state: 'offline', checkedAt: new Date() });
    }
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [check]);

  return { ...status, recheck: check };
}
