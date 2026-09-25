import { useState } from 'react';

import { formatBffErrorMessage } from '../../core/errors/bffError';
import { usePermission } from '../../core/permissions/permissionService';
import { assignedObjectRepository } from '../../entities/assignedObject/assignedObjectRepository';
import { AssignedObject } from '../../entities/assignedObject/types';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import { useObjects } from '../objects/hooks/useObjects';
import { useAssignedObjects } from './hooks/useAssignedObjects';

interface AssignedObjectsTabProps {
  userId: string;
}

export default function AssignedObjectsTab({ userId }: AssignedObjectsTabProps) {
  const { objects } = useObjects();
  const { assignedObjects, loading, error, reload } = useAssignedObjects(userId);
  const canManage = usePermission('assigned_objects', 'update');

  const [objectId, setObjectId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  function objectName(id: number): string {
    const object = objects.find(item => item.id === id);
    return object ? object.name : `#${id}`;
  }

  async function handleAdd() {
    if (!objectId) {
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      await assignedObjectRepository.create(userId, { objectId: Number(objectId), note: note || null });
      setObjectId('');
      setNote('');
      reload();
    } catch (err) {
      setSaveError(formatBffErrorMessage(err, 'Не удалось закрепить объект.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(assignedObject: AssignedObject) {
    setSaveError('');

    try {
      await assignedObjectRepository.remove(userId, assignedObject.objectId);
      reload();
    } catch (err) {
      setSaveError(formatBffErrorMessage(err, 'Не удалось открепить объект.'));
    }
  }

  return (
    <div>
      {loading && <EmptyState>Загрузка…</EmptyState>}
      {error && <div className="status-note rej">{error}</div>}
      {!loading && !error && assignedObjects.length === 0 && <EmptyState>Закреплённых объектов нет</EmptyState>}

      {assignedObjects.map(assignedObject => (
        <div className="hist-item" key={assignedObject.objectId}>
          <div>
            <div>{objectName(assignedObject.objectId)}</div>
            {assignedObject.note && <div className="d">{assignedObject.note}</div>}
          </div>

          {canManage && (
            <button className="win-close" onClick={() => handleRemove(assignedObject)} title="Открепить">
              ×
            </button>
          )}
        </div>
      ))}

      {canManage && (
        <form className="login-form" onSubmit={event => event.preventDefault()}>
          <label>
            Объект
            <select value={objectId} onChange={event => setObjectId(event.target.value)} disabled={saving}>
              <option value="">— выбрать —</option>
              {objects.map(object => (
                <option key={object.id} value={object.id}>
                  {object.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Примечание
            <input value={note} onChange={event => setNote(event.target.value)} disabled={saving} />
          </label>

          {saveError && <div className="login-error">{saveError}</div>}

          <Button type="button" variant="primary" onClick={handleAdd} disabled={saving || !objectId}>
            {saving ? 'Сохранение…' : 'Закрепить объект'}
          </Button>
        </form>
      )}
    </div>
  );
}
