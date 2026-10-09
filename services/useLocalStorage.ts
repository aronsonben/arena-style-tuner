import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  /**
   * Use lazy initialization to only run once upon mount. Essentially, when used in a file it will hit this useState upon mount.
   * Each time it mounts it tries to fetch the stored object and parse as JSOn.
   */
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : initialValue;
    } catch (error) {
      console.error(`[useLocalStorage] Failed to read key ${key} from localStorage.`);
      localStorage.removeItem(key);
      return initialValue;
    }
  });

  /**
   * Each time the key or state updates, we update localStorage here.
   */
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state as T));
    } catch (error) {
      console.error(`[useLocalStorage] Failed to write key ${key} to localStorage.`, error);
    }
  }, [key, state]);

  return [state, setState] as const;
}