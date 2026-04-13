import { useEffect, useState } from "react";

// Hook to debounce a value over a specified delay
// Useful for search inputs or similar scenarios
//Add debounce so you don’t spam the API while typing


export function useDebouncedValue<T>(value: T, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
