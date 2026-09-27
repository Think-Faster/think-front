import { useState } from 'react';

import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import CoefficientsTab from './CoefficientsTab';
import IgnoredRangesTab from './IgnoredRangesTab';
import ModelVersionsTab from './ModelVersionsTab';
import RetrainJobsTab from './RetrainJobsTab';
import WorkScheduleTab from './WorkScheduleTab';

type ModelSettingsTab = 'versions' | 'coefficients' | 'retrain' | 'ignored' | 'works';

const tabOptions: { value: ModelSettingsTab; label: string }[] = [
  { value: 'versions', label: 'Версии' },
  { value: 'coefficients', label: 'Коэффициенты' },
  { value: 'retrain', label: 'Переобучение' },
  { value: 'ignored', label: 'Игнорируемые диапазоны' },
  { value: 'works', label: 'График работ' },
];

export default function ModelSettingsWindow() {
  const [tab, setTab] = useState<ModelSettingsTab>('versions');

  return (
    <div className="pd-body">
      <div className="win-toolbar">
        <ChipFilterGroup options={tabOptions} value={tab} onChange={setTab} />
      </div>

      {tab === 'versions' && <ModelVersionsTab />}
      {tab === 'coefficients' && <CoefficientsTab />}
      {tab === 'retrain' && <RetrainJobsTab />}
      {tab === 'ignored' && <IgnoredRangesTab />}
      {tab === 'works' && <WorkScheduleTab />}
    </div>
  );
}
