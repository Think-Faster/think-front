import { useEffect, useRef } from 'react';

// Событие «данные изменились» между окнами: окно создания заявки сообщает,
// «Дневник диспетчера» и «История объектов» перечитывают свои списки;
// решение по прогнозу перечитывает «Журнал прогнозов».
export type DataEvent = 'task.created' | 'prediction.updated';

type Listener = () => void;

const listeners = new Map<DataEvent, Set<Listener>>();

export function emitDataEvent(event: DataEvent) {
  listeners.get(event)?.forEach(listener => listener());
}

export function useDataEvent(event: DataEvent, listener: Listener) {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const handler = () => listenerRef.current();
    const set = listeners.get(event) ?? new Set<Listener>();
    set.add(handler);
    listeners.set(event, set);

    return () => {
      set.delete(handler);
    };
  }, [event]);
}
