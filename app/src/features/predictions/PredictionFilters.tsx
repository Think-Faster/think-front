import { ChangeEvent } from 'react';

import { PredictionStatus } from '../../entities/prediction/types';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import { useObjects } from '../objects/hooks/useObjects';
import { statusFilterOptions } from './predictionLabels';

interface PredictionFiltersProps {
  status: PredictionStatus | 'all';
  onStatusChange: (value: PredictionStatus | 'all') => void;
  objectId: number | undefined;
  onObjectChange: (value: number | undefined) => void;
}

export default function PredictionFilters({
  status,
  onStatusChange,
  objectId,
  onObjectChange,
}: PredictionFiltersProps) {
  const { objects } = useObjects();

  function handleObjectChange(event: ChangeEvent<HTMLSelectElement>) {
    onObjectChange(event.target.value ? Number(event.target.value) : undefined);
  }

  return (
    <div className="win-toolbar">
      <ChipFilterGroup options={statusFilterOptions} value={status} onChange={onStatusChange} />

      <div className="filter-sep" />

      <select value={objectId ?? ''} onChange={handleObjectChange}>
        <option value="">Все объекты</option>
        {objects.map(object => (
          <option key={object.id} value={object.id}>
            {object.name}
          </option>
        ))}
      </select>
    </div>
  );
}
