import { FormEvent, useEffect, useState } from 'react';

import { usePermission } from '../../core/permissions/permissionService';
import { EngineerStatus } from '../../entities/engineer/types';
import Button from '../../shared/ui/Button';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';
import EmptyState from '../../shared/ui/EmptyState';
import { useBrigades } from './hooks/useBrigades';
import { useEngineerProfile } from './hooks/useEngineerProfile';
import { engineerStatusLabels, engineerStatusOptions } from './peopleLabels';

interface EngineerTabProps {
  userId: string;
}

const emptyForm = {
  brigadeId: '',
  phone: '',
  telegram: '',
  specialization: '',
  status: 'available' as EngineerStatus,
};

export default function EngineerTab({ userId }: EngineerTabProps) {
  const { profile, loading, error, save, saving, saveError } = useEngineerProfile(userId);
  const { brigades, createBrigade, creating: creatingBrigade, error: brigadesError, createError } = useBrigades();
  const canManage = usePermission('engineers', 'update');
  const canCreateBrigade = usePermission('engineers', 'create');

  const [form, setForm] = useState(emptyForm);
  const [brigadeName, setBrigadeName] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        brigadeId: profile.brigadeId ?? '',
        phone: profile.phone ?? '',
        telegram: profile.telegram ?? '',
        specialization: profile.specialization.join(', '),
        status: profile.status,
      });
    } else {
      setForm(emptyForm);
    }
  }, [profile]);

  function resolveBrigadeName(id: string): string {
    const brigade = brigades.find(item => item.id === id);
    return brigade ? brigade.name : id;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    await save({
      brigadeId: form.brigadeId || null,
      phone: form.phone || null,
      telegram: form.telegram || null,
      specialization: form.specialization
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
      status: form.status,
    });
  }

  async function handleCreateBrigade() {
    if (!brigadeName.trim()) {
      return;
    }

    if (await createBrigade({ name: brigadeName.trim() })) {
      setBrigadeName('');
    }
  }

  if (loading) {
    return <EmptyState>Загрузка…</EmptyState>;
  }

  if (error) {
    return <div className="status-note rej">{error}</div>;
  }

  return (
    <div>
      {!profile && <EmptyState>Профиля инженера пока нет</EmptyState>}

      {profile && (
        <div className="hist-item">
          <div>
            <div>{engineerStatusLabels[profile.status]}</div>
            <div className="d">
              {profile.brigadeId ? resolveBrigadeName(profile.brigadeId) : 'без бригады'}
              {profile.phone ? ` · ${profile.phone}` : ''}
              {profile.specialization.length > 0 ? ` · ${profile.specialization.join(', ')}` : ''}
            </div>
          </div>
        </div>
      )}

      {canManage && (
        <>
          <p className="pd-section-title">{profile ? 'Изменить профиль' : 'Создать профиль'}</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Бригада
              <select
                value={form.brigadeId}
                onChange={event => setForm(current => ({ ...current, brigadeId: event.target.value }))}
                disabled={saving}
              >
                <option value="">— без бригады —</option>
                {brigades.map(brigade => (
                  <option key={brigade.id} value={brigade.id}>
                    {brigade.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Телефон
              <input
                value={form.phone}
                onChange={event => setForm(current => ({ ...current, phone: event.target.value }))}
                disabled={saving}
              />
            </label>

            <label>
              Telegram
              <input
                value={form.telegram}
                onChange={event => setForm(current => ({ ...current, telegram: event.target.value }))}
                disabled={saving}
              />
            </label>

            <label>
              Специализация (через запятую)
              <input
                value={form.specialization}
                onChange={event => setForm(current => ({ ...current, specialization: event.target.value }))}
                disabled={saving}
              />
            </label>

            <label>
              Статус
              <ChipFilterGroup
                options={engineerStatusOptions}
                value={form.status}
                onChange={value => setForm(current => ({ ...current, status: value }))}
              />
            </label>

            {saveError && <div className="login-error">{saveError}</div>}

            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить профиль'}
            </Button>
          </form>
        </>
      )}

      <p className="pd-section-title">Бригады</p>

      {brigadesError && <div className="status-note rej">{brigadesError}</div>}
      {brigades.length === 0 && <EmptyState>Бригад пока нет</EmptyState>}

      {brigades.map(brigade => (
        <div className="hist-item" key={brigade.id}>
          <span>{brigade.name}</span>
        </div>
      ))}

      {canCreateBrigade && (
        <form className="login-form" onSubmit={event => event.preventDefault()}>
          <label>
            Новая бригада
            <input value={brigadeName} onChange={event => setBrigadeName(event.target.value)} disabled={creatingBrigade} />
          </label>

          {createError && <div className="login-error">{createError}</div>}

          <Button type="button" onClick={handleCreateBrigade} disabled={creatingBrigade || !brigadeName.trim()}>
            {creatingBrigade ? 'Создание…' : 'Добавить бригаду'}
          </Button>
        </form>
      )}
    </div>
  );
}
