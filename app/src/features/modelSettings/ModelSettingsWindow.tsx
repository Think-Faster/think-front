import { useState } from 'react';

import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import { useModelStatus } from './hooks/useModelStatus';
import IgnoredPeriodsTab from './IgnoredPeriodsTab';
import ModelVersionsTab from './ModelVersionsTab';
import OperatingSharesTab from './OperatingSharesTab';
import WorkScheduleTab from './WorkScheduleTab';

type ModelSettingsTab = 'versions' | 'shares' | 'gaps' | 'works';

const tabOptions: { value: ModelSettingsTab; label: string }[] = [
  { value: 'versions', label: 'Версии' },
  { value: 'shares', label: 'Рабочие доли' },
  { value: 'gaps', label: 'Игнорируемые периоды' },
  { value: 'works', label: 'График работ' },
];

// Версии, доли и игнорируемые периоды хранит модель: читаем /api/ml/status, меняем командами через BFF.
// Перечитать состояние — кнопкой обновления окна.
export default function ModelSettingsWindow() {
  const [tab, setTab] = useState<ModelSettingsTab>('versions');
  const { status, loading, error, send, acting, actionError, notice } = useModelStatus();

  return (
    <div className="pd-body">
      <div className="win-toolbar">
        <ChipFilterGroup options={tabOptions} value={tab} onChange={setTab} />
      </div>

      {tab !== 'works' && (
        <>
          {loading && <EmptyState>Загрузка…</EmptyState>}
          {error && <div className="status-note rej">{error}</div>}
          {actionError && <div className="login-error">{actionError}</div>}
          {notice && <div className="status-note ok">{notice}</div>}
        </>
      )}

      {status && tab === 'versions' && <ModelVersionsTab status={status} send={send} acting={acting} />}
      {status && tab === 'shares' && <OperatingSharesTab status={status} send={send} acting={acting} />}
      {status && tab === 'gaps' && <IgnoredPeriodsTab status={status} send={send} acting={acting} />}
      {tab === 'works' && <WorkScheduleTab />}
    </div>
  );
}
