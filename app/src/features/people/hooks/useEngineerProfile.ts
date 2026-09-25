import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage, parseBffError } from '../../../core/errors/bffError';
import { engineerRepository } from '../../../entities/engineer/engineerRepository';
import { EngineerProfile, UpdateEngineerProfileRequest } from '../../../entities/engineer/types';

export function useEngineerProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<EngineerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    engineerRepository
      .get(userId)
      .then(setProfile)
      .catch(err => {
        // 404 — валидный исход: у пользователя ещё нет профиля инженера.
        if (parseBffError(err).code === 'not_found') {
          setProfile(null);
          return;
        }

        setError(formatBffErrorMessage(err, 'Не удалось загрузить профиль инженера.'));
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(request: UpdateEngineerProfileRequest): Promise<boolean> {
    if (!userId) {
      return false;
    }

    setSaving(true);
    setSaveError('');

    try {
      const updated = await engineerRepository.update(userId, request);
      setProfile(updated);
      return true;
    } catch (err) {
      setSaveError(formatBffErrorMessage(err, 'Не удалось сохранить профиль инженера.'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { profile, loading, error, save, saving, saveError };
}
