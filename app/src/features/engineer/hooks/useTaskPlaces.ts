import { useEffect, useState } from 'react';

import { usePermission } from '../../../core/permissions/permissionService';
import { objectRepository } from '../../../entities/object/objectRepository';
import { MonitoredObject } from '../../../entities/object/types';

// Где заявка: объект, его коллектор (уровень 2) и адрес. Справочник объектов
// целиком инженеру не нужен — читаем только объекты своих заявок, по одному.
export interface TaskPlace {
  object: MonitoredObject;
  collector: MonitoredObject | null;
  address: string | null;
}

// Дальше коллектора вверх не идём: выше — район.
const COLLECTOR_LEVEL = 2;
const MAX_DEPTH = 4;

const cache = new Map<number, Promise<MonitoredObject>>();

function objectById(id: number): Promise<MonitoredObject> {
  let request = cache.get(id);
  if (!request) {
    request = objectRepository.get(id);
    request.catch(() => cache.delete(id));
    cache.set(id, request);
  }
  return request;
}

async function placeOf(id: number): Promise<TaskPlace> {
  const object = await objectById(id);
  let current: MonitoredObject | null = object;
  for (let depth = 0; current && current.level > COLLECTOR_LEVEL && depth < MAX_DEPTH; depth++) {
    current = current.parentId !== null ? await objectById(current.parentId) : null;
  }
  const collector = current && current.level === COLLECTOR_LEVEL ? current : null;
  return { object, collector, address: object.address ?? collector?.address ?? null };
}

// Без objects:read места нет — экран показывает «Объект N».
export function useTaskPlaces(objectIds: number[]): Map<number, TaskPlace> {
  const canRead = usePermission('objects', 'read');
  const [places, setPlaces] = useState<Map<number, TaskPlace>>(new Map());
  const idsKey = Array.from(new Set(objectIds)).sort((a, b) => a - b).join(',');

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    if (!canRead || ids.length === 0) {
      setPlaces(new Map());
      return;
    }
    let cancelled = false;
    Promise.allSettled(ids.map(placeOf)).then(results => {
      if (cancelled) {
        return;
      }
      const next = new Map<number, TaskPlace>();
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          next.set(ids[index], result.value);
        }
      });
      setPlaces(next);
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey, canRead]);

  return places;
}

export function objectTitle(objectId: number, place: TaskPlace | undefined): string {
  return place?.object.name || `Объект ${objectId}`;
}
