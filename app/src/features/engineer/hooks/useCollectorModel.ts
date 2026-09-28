import { useMemo } from 'react';

import { usePermission } from '../../../core/permissions/permissionService';
import { buildCollector, CollectorModel } from '../../map/collector';
import { useMapLayer } from '../../map/hooks/useMapLayers';

// Коллектор заявки теми же слоями, что у окна «Карта»: трассы и пикеты
// (уровень 2), датчики с пикетами (уровень 3). Слои читаются по objects:read.
export function useCollectorModel(collectorId: number | null): { model: CollectorModel; loading: boolean } {
  const canRead = usePermission('objects', 'read');
  const id = canRead ? collectorId : null;
  const l2 = useMapLayer(id, 2);
  const l3 = useMapLayer(id, 3);
  const model = useMemo(() => buildCollector(l2.features, l3.features), [l2.features, l3.features]);

  return { model, loading: id !== null && (l2.loading || l3.loading) };
}
