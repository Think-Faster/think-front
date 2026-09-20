import { useState } from 'react';

import { useInterval } from './useInterval';

export function useClock(intervalMs = 1000): string {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('ru-RU'));

  useInterval(() => setTime(new Date().toLocaleTimeString('ru-RU')), intervalMs);

  return time;
}
