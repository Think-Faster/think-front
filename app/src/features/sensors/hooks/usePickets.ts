import { useEffect, useState } from 'react';

import { MonitoredObject } from '../../../entities/object/types';
import { picketRepository } from '../../../entities/picket/picketRepository';
import { Picket } from '../../../entities/picket/types';

// Пикеты для датчика объекта. Пикеты размечены на коллекторе, а датчик
// бывает привязан и к его участку — тогда берутся пикеты ближайшего предка,
// у которого они есть.
export function usePickets(objectId: number | null, objects: MonitoredObject[]) {
  const [pickets, setPickets] = useState<Picket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (objectId === null) {
      setPickets([]);
      return;
    }

    let cancelled = false;
    const chain: number[] = [];
    for (let id: number | null = objectId; id !== null && !chain.includes(id); ) {
      chain.push(id);
      const current: number = id;
      id = objects.find(object => object.id === current)?.parentId ?? null;
    }

    async function load() {
      setLoading(true);
      for (const id of chain) {
        const found = await picketRepository.getByObject(id).catch(() => [] as Picket[]);
        if (found.length > 0 || cancelled) {
          return found;
        }
      }
      return [] as Picket[];
    }

    load().then(found => {
      if (!cancelled) {
        setPickets(found);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [objectId, objects]);

  return { pickets, loading };
}
