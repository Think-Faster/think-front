import { EmailSendStatus, TelegramSendStatus } from '../../entities/notification/types';

export const emailSendStatusLabels: Record<EmailSendStatus, string> = {
  sent: 'принято в обработку',
  rateLimited: 'письмо уже отправлено недавно',
  userNotFound: 'пользователь не найден',
  noEmailOnFile: 'у пользователя не указана почта',
  invalidEmail: 'некорректный email',
  failed: 'не удалось поставить в очередь',
};

// sent — низкий/спокойный тон: это не «доставлено», просто штатный исход.
// rateLimited/noEmailOnFile — не сбой, а ожидаемая причина не отправить
// именно этому адресу, поэтому средний тон, а не тревожный красный.
export function emailSendStatusTone(status: EmailSendStatus): 'high' | 'med' | 'low' {
  switch (status) {
    case 'sent':
      return 'low';
    case 'rateLimited':
    case 'noEmailOnFile':
      return 'med';
    default:
      return 'high';
  }
}

// Тип письма — только для логов tf-mail (контракт SendEmailRequest.kind):
// по факту или по прогнозу, как режим рекомендации (§11 доменного документа).
export const emailKindOptions: { value: string; label: string }[] = [
  { value: 'fact', label: 'по факту' },
  { value: 'forecast', label: 'по прогнозу' },
];

export const telegramSendStatusLabels: Record<TelegramSendStatus, string> = {
  sent: 'принято в обработку',
  rateLimited: 'сообщение уже отправлено недавно',
  userNotFound: 'пользователь не найден',
  noTelegramOnFile: 'не указан Telegram',
  notLinked: 'не подключил бота',
  failed: 'не удалось поставить в очередь',
};

// Как у письма: незаполненный профиль и неподключённый бот — не сбой, а
// причина, которую исправляет сам человек.
export function telegramSendStatusTone(status: TelegramSendStatus): 'high' | 'med' | 'low' {
  switch (status) {
    case 'sent':
      return 'low';
    case 'rateLimited':
    case 'noTelegramOnFile':
    case 'notLinked':
      return 'med';
    default:
      return 'high';
  }
}
