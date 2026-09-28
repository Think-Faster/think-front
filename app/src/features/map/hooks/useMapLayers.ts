import { useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { objectRepository } from '../../../entities/object/objectRepository';
import { Feature } from '../geo';

// Уровни слоёв карты (/objects/{id}/layers, docs/backend/домены-и-сущности.md §13.3):
// 1 — район: граница, трассы коллекторов, диспетчерские пункты;
// 2 — коллектор: трассы, ответвления, объекты-участки, пикеты;
// 3 — датчики коллектора с привязкой к пикету и объекту;
// 4 — принципиальная схема: коридоры развёрнуты в прямые, датчики по полосам.
export type LayerLevel = 1 | 2 | 3 | 4;

function parseLayers(geoJsons: string[]): Feature[] {
  return geoJsons.flatMap(text => {
    try {
      const parsed = JSON.parse(text) as { features?: Feature[] };
      return parsed.features ?? [];
    } catch {
      return [];
    }
  });
}

// Слои меняются только при загрузке сида — держим их на всё время сессии,
// чтобы переход «район → коллектор → схема» и обратно не ждал сеть.
const cache = new Map<string, Promise<Feature[]>>();

function fetchLayer(objectId: number, level: LayerLevel): Promise<Feature[]> {
  const key = `${objectId}:${level}`;
  let request = cache.get(key);
  if (!request) {
    request = objectRepository
      .getLayers(objectId, level)
      .then(layers => parseLayers(layers.map(layer => layer.geoJson)));
    request.catch(() => cache.delete(key));
    cache.set(key, request);
  }
  return request;
}

const EMPTY: Feature[] = [];

export function useMapLayer(objectId: number | null, level: LayerLevel) {
  const [state, setState] = useState<{ key: string; features: Feature[]; error: string }>({
    key: '',
    features: EMPTY,
    error: '',
  });
  const key = objectId === null ? '' : `${objectId}:${level}`;

  useEffect(() => {
    if (objectId === null) {
      return;
    }
    let cancelled = false;
    const current = `${objectId}:${level}`;
    fetchLayer(objectId, level)
      .then(features => {
        if (!cancelled) {
          setState({ key: current, features, error: '' });
        }
      })
      .catch(err => {
        if (!cancelled) {
          setState({
            key: current,
            features: EMPTY,
            error: formatBffErrorMessage(err, 'Не удалось загрузить слой карты.'),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [objectId, level]);

  const ready = key !== '' && state.key === key;
  return {
    features: ready ? state.features : EMPTY,
    loading: key !== '' && !ready,
    error: ready ? state.error : '',
  };
}
