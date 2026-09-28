import { useEffect, useState } from 'react';

import { usePermission } from '../../../core/permissions/permissionService';
import { sensorRepository } from '../../../entities/sensor/sensorRepository';
import { Sensor } from '../../../entities/sensor/types';

// BFF отдаёт датчики по одному объекту, а в районе их тысячи: названия
// подгружаем, только если объектов в выборке немного, иначе в строке
// остаётся номер канала.
export const SENSOR_NAME_OBJECTS = 30;
const SENSORS_PAGE_SIZE = 1000;

const cache = new Map<number, Promise<Sensor[]>>();

function sensorsOf(objectId: number): Promise<Sensor[]> {
  let request = cache.get(objectId);
  if (!request) {
    request = sensorRepository.getList({ objectId, pageSize: SENSORS_PAGE_SIZE }).then(page => page.items);
    request.catch(() => cache.delete(objectId));
    cache.set(objectId, request);
  }
  return request;
}

export function useSensorNames(objectIds: number[]): Map<number, string> {
  const canRead = usePermission('sensors', 'read');
  const [names, setNames] = useState<Map<number, string>>(new Map());
  const idsKey = objectIds.join(',');

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    if (!canRead || ids.length === 0 || ids.length > SENSOR_NAME_OBJECTS) {
      setNames(new Map());
      return;
    }
    let cancelled = false;
    Promise.allSettled(ids.map(sensorsOf)).then(results => {
      if (cancelled) {
        return;
      }
      const next = new Map<number, string>();
      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const sensor of result.value) {
            next.set(sensor.id, sensor.name);
          }
        }
      }
      setNames(next);
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey, canRead]);

  return names;
}
