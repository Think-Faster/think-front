import { FormEvent, useEffect, useState } from 'react';

import { TELEGRAM_USERNAME_PATTERN } from '../../entities/user/types';
import { useMyTelegram } from './hooks/useMyTelegram';

interface TelegramProfileProps {
  active: boolean;
}

// Блок профиля: своё имя в Telegram и подключение бота. Бот не может написать
// первым — человек сам открывает его и нажимает «Старт», бот сверяет имя.
export default function TelegramProfile({ active }: TelegramProfileProps) {
  const { status, saving, error, save } = useMyTelegram(active);
  const [value, setValue] = useState('');

  const saved = status?.username ? `@${status.username}` : '';

  useEffect(() => {
    setValue(saved);
  }, [saved]);

  const changed = value.trim() !== saved;
  const botLink = status?.bot ? `https://t.me/${status.bot}` : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await save(value.trim());
  }

  function renderState() {
    if (!status || changed) {
      return null;
    }

    if (!status.username) {
      return 'Укажите имя из Telegram (Настройки → Имя пользователя).';
    }

    if (status.linked === true) {
      return 'Бот подключён — уведомления придут в Telegram.';
    }

    if (status.linked === null) {
      return 'Не удалось проверить подключение бота.';
    }

    return botLink ? (
      <>
        Откройте <a href={botLink} target="_blank" rel="noreferrer">@{status.bot}</a> и нажмите «Старт».
      </>
    ) : (
      'Откройте бота уведомлений и нажмите «Старт».'
    );
  }

  const state = renderState();

  return (
    <form className="user-menu-id tg-profile" onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="tg-profile-username">
        Telegram для уведомлений
      </label>

      <div className="tg-profile-row">
        <input
          id="tg-profile-username"
          value={value}
          onChange={event => setValue(event.target.value)}
          placeholder="@имя"
          pattern={TELEGRAM_USERNAME_PATTERN}
          title="Имя пользователя Telegram: 5–32 символа, латиница, цифры и _"
          disabled={saving || status === null}
          autoComplete="off"
        />
        {changed && (
          <button className="btn" type="submit" disabled={saving}>
            {saving ? '…' : 'Сохранить'}
          </button>
        )}
      </div>

      {error && <div className="login-error">{error}</div>}
      {state && <div className="tg-profile-state">{state}</div>}
    </form>
  );
}
