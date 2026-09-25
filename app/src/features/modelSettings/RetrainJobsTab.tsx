import { useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { useRetrainJobs } from './hooks/useRetrainJobs';

function jobTone(status: string): 'high' | 'med' | 'low' {
  if (status === 'failed') {
    return 'high';
  }

  if (status === 'finished') {
    return 'low';
  }

  return 'med';
}

export default function RetrainJobsTab() {
  const { jobs, loading, error, createJob, creating, createError } = useRetrainJobs();
  const canManage = usePermission('model_settings', 'manage');

  const [paramsJson, setParamsJson] = useState('');

  async function handleCreate() {
    if (await createJob({ paramsJson: paramsJson || null })) {
      setParamsJson('');
    }
  }

  return (
    <div>
      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && jobs.length === 0 && <EmptyState>Заявок на переобучение пока нет</EmptyState>}

      {jobs.map(job => (
        <div className="hist-item" key={job.id}>
          <div>
            <div>#{job.id}</div>
            <div className="d">
              {new Date(job.requestedAt).toLocaleString('ru-RU')}
              {job.resultModelVersionId ? ` · версия ${job.resultModelVersionId}` : ''}
            </div>
          </div>

          <Badge tone={jobTone(job.status)}>{job.status}</Badge>
        </div>
      ))}

      {canManage && (
        <form className="login-form" onSubmit={event => event.preventDefault()}>
          <label>
            Параметры (JSON)
            <textarea
              value={paramsJson}
              onChange={event => setParamsJson(event.target.value)}
              disabled={creating}
              rows={3}
            />
          </label>

          {createError && <div className="login-error">{createError}</div>}

          <Button type="button" variant="primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Отправка…' : 'Запросить переобучение'}
          </Button>
        </form>
      )}
    </div>
  );
}
