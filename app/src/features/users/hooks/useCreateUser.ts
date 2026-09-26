import { useState } from 'react';

import { authApi } from '../../../core/auth/authApi';
import { formatBffErrorMessage } from '../../../core/errors/bffError';
import { userRepository } from '../../../entities/user/userRepository';
import { User } from '../../../entities/user/types';

interface ProfileFields {
  lastName: string;
  firstName: string;
  middleName: string;
}

// Учётка (сервис аутентификации) и профиль (BFF) — разные сущности с разными
// id. Профиль можно завести либо вместе с новой учёткой (accountSource: 'new'),
// либо поверх уже существующей учётки, если её id уже известен
// (accountSource: 'existing') — тогда шаг регистрации просто пропускается.
export type CreateUserInput =
  | (ProfileFields & {
      accountSource: 'new';
      userName: string;
      password: string;
      email: string;
    })
  | (ProfileFields & {
      accountSource: 'existing';
      authUserId: string;
    });

export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createUser(input: CreateUserInput): Promise<User | null> {
    setLoading(true);
    setError('');

    let authUserId: string;

    if (input.accountSource === 'new') {
      try {
        // Шаг 1: регистрируем новую учётку в сервисе аутентификации.
        const account = await authApi.register({
          userName: input.userName,
          password: input.password,
          email: input.email,
        });

        authUserId = account.id;
      } catch {
        setError('Не удалось зарегистрировать учётную запись.');
        setLoading(false);
        return null;
      }
    } else {
      // Учётка уже существует — используем указанный id напрямую.
      authUserId = input.authUserId;
    }

    try {
      // Шаг 2: заводим профиль в BFF, привязывая его к учётке.
      const user = await userRepository.create({
        authUserId,
        lastName: input.lastName,
        firstName: input.firstName,
        middleName: input.middleName || null,
      });

      return user;
    } catch (err) {
      // Если это была новая учётка — она в tf-auth уже создана, а профиль в
      // BFF — нет. Отката регистрации здесь нет (такого эндпоинта в
      // контракте BFF нет) — при повторной попытке с тем же логином tf-auth
      // должен сам ответить конфликтом.
      setError(formatBffErrorMessage(err, 'Не удалось создать профиль пользователя.'));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createUser, loading, error };
}
