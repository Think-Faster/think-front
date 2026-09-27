import { act, renderHook } from '@testing-library/react';
import { useFunnelLog } from './useFunnelLog';

const flush = () => act(async () => {});

function respond(status, body = []) {
  return Promise.resolve({ ok: status < 300, status, text: () => Promise.resolve(JSON.stringify(body)) });
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('быстрые изменения фильтра дают один запрос', async () => {
  global.fetch = jest.fn(() => respond(200, [{ channelId: 1, value: 2, ts: '2026-09-27T10:00:00Z' }]));
  const { result, rerender } = renderHook((p) => useFunnelLog(p), {
    initialProps: { objectId: 5, from: '', to: '', limit: 100 },
  });
  for (const limit of [200, 300, 400, 500]) {
    rerender({ objectId: 5, from: '', to: '', limit });
    act(() => jest.advanceTimersByTime(100));
  }
  act(() => jest.advanceTimersByTime(500));
  await flush();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][0]).toBe('/api/funnel/log?objectId=5&limit=500');
  expect(result.current.items[0].value).toBe(2);
});

test('429 — повтор после паузы, без ошибки для пользователя', async () => {
  global.fetch = jest.fn().mockReturnValueOnce(respond(429)).mockReturnValue(respond(200, []));
  const { result } = renderHook(() => useFunnelLog({ objectId: 5, from: '', to: '', limit: 100 }));
  act(() => jest.advanceTimersByTime(500));
  await flush();
  expect(result.current.status).toBe('loading');
  act(() => jest.advanceTimersByTime(1500));
  await flush();
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(result.current.status).toBe('done');
});
