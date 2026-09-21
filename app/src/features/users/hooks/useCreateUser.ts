import { useState } from 'react';

import { authApi } from '../../../core/auth/authApi';
import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { userRepository } from '../../../entities/user/userRepository';
import { User } from '../../../entities/user/types';

export interface CreateUserInput {
  userName: string;
  password: string;
  email: string;
  lastName: string;
  firstName: string;
  middleName: string;
}

export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createUser(input: CreateUserInput): Promise<User | null> {
    setLoading(true);
    setError('');

    let authUserId: string;

    try {
      // Шаг 1: регистрируем учётку в сервисе аутентификации.
      const account = await authApi.register({
        userName: input.userName,
        password: input.password,
        email: input.email,
      });

      authUserId = account.id;
    } catch {
      setError('Не удалось зарегистрировать пользователя.');
      setLoading(false);
      return null;
    }

    try {
      // Шаг 2: только после успешной регистрации заводим пользователя в BFF,
      // привязывая его к только что созданной учётке.
      const user = await userRepository.create({
        authUserId,
        lastName: input.lastName,
        firstName: input.firstName,
        middleName: input.middleName || null,
      });

      return user;
    } catch (err) {
      // Учётка в tf-auth уже создана, а запись в BFF — нет. Отката
      // регистрации здесь нет (эндпоинта для этого в контракте BFF нет) —
      // при повторной попытке с тем же логином tf-auth должен сам ответить
      // конфликтом.
      setError(formatBffErrorMessage(err, 'Не удалось создать пользователя в BFF.'));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createUser, loading, error };
}
