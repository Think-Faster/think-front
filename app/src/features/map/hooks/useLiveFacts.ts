import { useCallback, useEffect, useState } from 'react';

import { usePermission } from '../../../core/permissions/permissionService';
import { factAlertRepository } from '../../../entities/factAlert/factAlertRepository';
import { FactAlert } from '../../../entities/factAlert/types';
import { useInterval } from '../../../shared/hooks/useInterval';

// Модель ведёт эпизод раз в час, но объявление может прийти в любую минуту —
// карта перечитывает идущие эпизоды раз в минуту.
export const LIVE_FACTS_REFRESH_MS = 60_000;
const LIVE_FACTS_PAGE_SIZE = 200;

const EMPTY: FactAlert[] = [];

// Идущие тревоги по факту (/fact-alerts?live=true): маршрут нарушителя,
// причина слепоты, значки на карте района. Без права predictions:read — пусто.
export function useLiveFacts(): FactAlert[] {
  const canRead = usePermission('predictions', 'read');
  const [alerts, setAlerts] = useState<FactAlert[]>(EMPTY);

  const load = useCallback(() => {
    factAlertRepository
      .getList({ live: true, page: 1, pageSize: LIVE_FACTS_PAGE_SIZE })
      .then(result => setAlerts(result.items))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (canRead) {
      load();
    }
  }, [canRead, load]);
  useInterval(load, canRead ? LIVE_FACTS_REFRESH_MS : null);

  return canRead ? alerts : EMPTY;
}
