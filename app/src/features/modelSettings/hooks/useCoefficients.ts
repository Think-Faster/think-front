import { useCallback, useEffect, useState } from 'react';

import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { coefficientRepository } from '../../../entities/coefficient/coefficientRepository';
import { Coefficient, CreateCoefficientRequest } from '../../../entities/coefficient/types';

export function useCoefficients() {
  const [coefficients, setCoefficients] = useState<Coefficient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');

    coefficientRepository
      .getList()
      .then(setCoefficients)
      .catch(err => setError(formatBffErrorMessage(err, 'Не удалось загрузить коэффициенты.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createCoefficient(request: CreateCoefficientRequest): Promise<boolean> {
    setCreating(true);
    setCreateError('');

    try {
      await coefficientRepository.create(request);
      reload();
      return true;
    } catch (err) {
      setCreateError(formatBffErrorMessage(err, 'Не удалось сохранить коэффициент.'));
      return false;
    } finally {
      setCreating(false);
    }
  }

  return { coefficients, loading, error, createCoefficient, creating, createError };
}
