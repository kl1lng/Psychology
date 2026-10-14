'use client';

import { useState, useEffect } from 'react';

/**
 * useDebounce Hook
 * Delays updating the debounced value until after the specified delay has passed
 * since the last time the value was changed.
 *
 * @param value The value to debounce (e.g. search query string)
 * @param delay Delay in milliseconds (default 400ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
