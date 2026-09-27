import { act, renderHook } from '@testing-library/react';
import { useFunnelStream } from './useFunnelStream';

class FakeSocket {
  static all = [];
  constructor(url) {
    this.url = url;
    this.closedWith = null;
    FakeSocket.all.push(this);
  }
  close(code) {
    this.closedWith = code;
  }
  // Помощники теста.
  send(msg) {
    act(() => this.onmessage({ data: JSON.stringify(msg) }));
  }
  drop(code) {
    act(() => this.onclose({ code }));
  }
  static last() {
    return FakeSocket.all[FakeSocket.all.length - 1];
  }
}

function mockFetch(routes) {
  global.fetch = jest.fn((url) => {
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    const status = key ? routes[key] : 404;
    return Promise.resolve({ ok: status >= 200 && status < 300, status, text: () => Promise.resolve('') });
  });
}

const flush = () => act(async () => {});

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.all = [];
  global.WebSocket = FakeSocket;
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  mockFetch({});
});

afterEach(() => {
  jest.useRealTimers();
});

test('подключается к wss текущего домена без токена в URL и принимает ready/reading/status', () => {
  const { result } = renderHook(() => useFunnelStream(42));
  expect(FakeSocket.last().url).toBe(`ws://${window.location.host}/api/funnel/stream?objectId=42`);
  expect(result.current.phase).toBe('connecting');

  FakeSocket.last().send({ type: 'ready' });
  expect(result.current.phase).toBe('live');

  FakeSocket.last().send({ type: 'reading', channelId: 7, value: 1.5, ts: '2026-09-27T10:00:00Z' });
  act(() => jest.runOnlyPendingTimers());
  expect(result.current.channels.get(7).value).toBe(1.5);

  FakeSocket.last().send({ type: 'status', channelId: 7, silent: true });
  act(() => jest.runOnlyPendingTimers());
  expect(result.current.channels.get(7).silent).toBe(true);

  FakeSocket.last().send({ type: 'dropped', count: 5 });
  expect(result.current.dropped).toBe(5);
});

test('паузы переподключения 1→2→5 с и сброс после ready', async () => {
  mockFetch({ '/api/funnel/status': 503 });
  renderHook(() => useFunnelStream(1));

  FakeSocket.last().drop(1006);
  expect(FakeSocket.all).toHaveLength(1);
  act(() => jest.advanceTimersByTime(999));
  expect(FakeSocket.all).toHaveLength(1);
  act(() => jest.advanceTimersByTime(1));
  expect(FakeSocket.all).toHaveLength(2);

  FakeSocket.last().drop(1006);
  act(() => jest.advanceTimersByTime(2000));
  expect(FakeSocket.all).toHaveLength(3);

  FakeSocket.last().send({ type: 'ready' });
  FakeSocket.last().drop(1001);
  act(() => jest.advanceTimersByTime(1000));
  expect(FakeSocket.all).toHaveLength(4);
});

test('4401 — refresh токена и сразу переподключение', async () => {
  mockFetch({ '/api/auth/refresh': 200 });
  renderHook(() => useFunnelStream(1));
  FakeSocket.last().send({ type: 'ready' });
  FakeSocket.last().drop(4401);
  await flush();
  expect(global.fetch).toHaveBeenCalledWith('/api/auth/refresh', expect.objectContaining({ method: 'POST' }));
  expect(FakeSocket.all).toHaveLength(2);
});

test('4401 и refresh не удался — просим войти, без новых попыток', async () => {
  mockFetch({ '/api/auth/refresh': 401 });
  const { result } = renderHook(() => useFunnelStream(1));
  FakeSocket.last().drop(4401);
  await flush();
  expect(result.current.phase).toBe('auth');
  act(() => jest.advanceTimersByTime(60000));
  expect(FakeSocket.all).toHaveLength(1);
});

async function failThreeTimes() {
  FakeSocket.last().drop(1006);
  act(() => jest.advanceTimersByTime(1000));
  FakeSocket.last().drop(1006);
  act(() => jest.advanceTimersByTime(2000));
  FakeSocket.last().drop(1006);
  await flush();
}

test('несколько неудач без ready и /status 403 — сообщение и остановка', async () => {
  mockFetch({ '/api/funnel/status': 403 });
  const { result } = renderHook(() => useFunnelStream(1));
  await failThreeTimes();
  expect(result.current.phase).toBe('forbidden');
  const count = FakeSocket.all.length;
  act(() => jest.advanceTimersByTime(60000));
  expect(FakeSocket.all).toHaveLength(count);
});

test('несколько неудач без ready и /status 401 без refresh — просим войти', async () => {
  mockFetch({ '/api/funnel/status': 401, '/api/auth/refresh': 401 });
  const { result } = renderHook(() => useFunnelStream(1));
  await failThreeTimes();
  await flush();
  expect(result.current.phase).toBe('auth');
});

test('/status 503 — сообщение о недоступности, попытки продолжаются', async () => {
  mockFetch({ '/api/funnel/status': 503 });
  const { result } = renderHook(() => useFunnelStream(1));
  await failThreeTimes();
  expect(result.current.phase).toBe('unavailable');
  expect(result.current.reason).toBe('service');
  const count = FakeSocket.all.length;
  act(() => jest.advanceTimersByTime(5000));
  expect(FakeSocket.all).toHaveLength(count + 1);
});

test('смена объекта закрывает сокет кодом 1000 и открывает новый; после обрыва сообщает период', () => {
  const onReconnected = jest.fn();
  const { rerender, unmount } = renderHook(({ id }) => useFunnelStream(id, { onReconnected }), {
    initialProps: { id: 1 },
  });
  const first = FakeSocket.last();
  rerender({ id: 2 });
  expect(first.closedWith).toBe(1000);
  expect(FakeSocket.last().url).toContain('objectId=2');

  FakeSocket.last().send({ type: 'ready' });
  FakeSocket.last().drop(1001);
  act(() => jest.advanceTimersByTime(1000));
  FakeSocket.last().send({ type: 'ready' });
  expect(onReconnected).toHaveBeenCalledWith({ from: expect.any(Date), to: expect.any(Date) });

  const current = FakeSocket.last();
  unmount();
  expect(current.closedWith).toBe(1000);
});
