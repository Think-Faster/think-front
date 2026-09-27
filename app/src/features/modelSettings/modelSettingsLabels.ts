import { PredictionType } from '../../entities/prediction/types';
import { IgnoredRangeScope } from '../../entities/ignoredRange/types';
import { WorkSource } from '../../entities/workSchedule/types';
import { predictionTypeLabels } from '../predictions/predictionLabels';

export { predictionTypeLabels as coefficientTypeLabels };

export const coefficientTypeOptions: { value: PredictionType; label: string }[] = (
  Object.entries(predictionTypeLabels) as [PredictionType, string][]
).map(([value, label]) => ({ value, label }));

export const ignoredRangeScopeLabels: Record<IgnoredRangeScope, string> = {
  all: 'всё',
  object: 'объект',
  sensor: 'датчик',
};

export const ignoredRangeScopeOptions: { value: IgnoredRangeScope; label: string }[] = (
  Object.entries(ignoredRangeScopeLabels) as [IgnoredRangeScope, string][]
).map(([value, label]) => ({ value, label }));

export const workSourceLabels: Record<WorkSource, string> = {
  organizer: 'график организатора',
  chiefDispatcher: 'главный диспетчер',
  carriedOver: 'перенесена',
};
