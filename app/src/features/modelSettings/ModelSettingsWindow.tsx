import { useState } from 'react';

import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import CoefficientsTab from './CoefficientsTab';
import IgnoredRangesTab from './IgnoredRangesTab';
import ModelVersionsTab from './ModelVersionsTab';
import RetrainJobsTab from './RetrainJobsTab';

type ModelSettingsTab = 'versions' | 'coefficients' | 'retrain' | 'ignored';

const tabOptions: { value: ModelSettingsTab; label: string }[] = [
  { value: 'versions', label: 'Версии' },
  { value: 'coefficients', label: 'Коэффициенты' },
  { value: 'retrain', label: 'Переобучение' },
  { value: 'ignored', label: 'Игнорируемые диапазоны' },
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
    </div>
  );
}
