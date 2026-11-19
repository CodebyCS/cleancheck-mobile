import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Calls onForeground each time the app comes back from the background,
 * e.g. after the phone was locked or the person switched apps.
 * Data shown before may be outdated by then (new notices, reassigned tasks).
 */
export function useAppForeground(onForeground: () => void): void {
  const callback = useRef(onForeground);

  // Always call the latest version, which sees the current state of the screen.
  useEffect(() => {
    callback.current = onForeground;
  });

  useEffect(() => {
    let previous = AppState.currentState;

    const subscription = AppState.addEventListener('change', (next) => {
      if (previous !== 'active' && next === 'active') callback.current();
      previous = next;
    });

    return () => subscription.remove();
  }, []);
}