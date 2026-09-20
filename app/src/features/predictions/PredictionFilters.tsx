import { PredictionStatus, Risk } from '../../entities/prediction/types';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import { riskFilterOptions, statusFilterOptions } from './predictionLabels';

interface PredictionFiltersProps {
  risk: Risk | 'all';
  onRiskChange: (value: Risk | 'all') => void;
  status: PredictionStatus | 'all';
  onStatusChange: (value: PredictionStatus | 'all') => void;
}

export default function PredictionFilters({
  risk,
  onRiskChange,
  status,
  onStatusChange,
}: PredictionFiltersProps) {
  return (
    <div className="win-toolbar">
      <ChipFilterGroup options={riskFilterOptions} value={risk} onChange={onRiskChange} />
      <div className="filter-sep" />
      <ChipFilterGroup options={statusFilterOptions} value={status} onChange={onStatusChange} />
    </div>
  );
}
