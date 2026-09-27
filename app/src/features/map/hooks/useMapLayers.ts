import { useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { objectRepository } from '../../../entities/object/objectRepository';

export type Position = number[];

export interface Geometry {
  type: string;
  coordinates: unknown;
}

export interface Feature {
  geometry: Geometry | null;
  properties: Record<string, unknown> | null;
}

// Что показывает карта: район целиком (уровень 1) или схему одного
// коллектора (уровень 2) — трассы, ответвления, участки, пикеты.
export interface MapView {
  level: 1 | 2;
  objectId: number;
}

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

// Слои схемы из BFF (/objects/{id}/layers) для выбранного вида карты.
export function useMapLayers(view: MapView | null) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!view) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    objectRepository
      .getLayers(view.objectId, view.level)
      .then(layers => {
        if (!cancelled) {
          setFeatures(parseLayers(layers.map(layer => layer.geoJson)));
        }
      })
      .catch(err => {
        if (!cancelled) {
          setFeatures([]);
          setError(formatBffErrorMessage(err, 'Не удалось загрузить схему.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [view]);

  return { features, loading, error };
}
