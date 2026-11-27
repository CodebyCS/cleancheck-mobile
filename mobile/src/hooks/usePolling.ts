import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Calls onTick every intervalMs while the screen is mounted and the app is in the foreground.
 * A check that failed (no network) is simply tried again on the next tick, so the screen
 * recovers on its own once the connection is back.
 */
export function usePolling(intervalMs: number, onTick: () => void): void {
  const callback = useRef(onTick);

  // Always call the latest version, which sees the current state of the screen.
  useEffect(() => {
    callback.current = onTick;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      // In the background nobody is looking: no requests.
      if (AppState.currentState === 'active') callback.current();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);
}