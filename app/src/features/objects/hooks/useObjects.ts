import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { objectRepository } from '../../../entities/object/objectRepository';
import { MonitoredObject } from '../../../entities/object/types';

// Справочник целиком: на dev 95 объектов, а страница BFF по умолчанию — 50,
// и в выпадающих списках терялась половина.
const OBJECTS_PAGE_SIZE = 500;

// Справочник нужен почти каждому окну (карта, журналы, фильтры) — один
// запрос на всех, пока кто-то не попросит перечитать (reload после правки).
let shared: Promise<MonitoredObject[]> | null = null;

function fetchObjects(force: boolean): Promise<MonitoredObject[]> {
  if (!shared || force) {
    const request = objectRepository.getList({ pageSize: OBJECTS_PAGE_SIZE }).then(result => result.items);
    request.catch(() => {
      if (shared === request) {
        shared = null;
      }
    });
    shared = request;
  }
  return shared;
}

export function useObjects() {
  const [objects, setObjects] = useState<MonitoredObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((force: boolean) => {
    setLoading(true);
    setError('');

    fetchObjects(force)
      .then(setObjects)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить объекты.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const reload = useCallback(() => load(true), [load]);

  return { objects, loading, error, reload };
}
