// Лимиты сервера (докa §"POST /notifications/email") — обрезка происходит
// молча, без ошибки, поэтому проверяем длину и предупреждаем до отправки.
export const SUBJECT_MAX_LENGTH = 255;
export const TEXT_MAX_LENGTH = 20000;

export type EmailSendStatus =
  | 'sent' // принято в обработку почтовым сервисом — не значит «доставлено»
  | 'rateLimited' // тому же адресу уже отправляли письмо меньше минуты назад
  | 'userNotFound' // userId из userIds не существует
  | 'noEmailOnFile' // пользователь есть, но email в профиле не заполнен
  | 'invalidEmail' // строка из emails не похожа на email
  | 'failed'; // очередь отвергла публикацию

export interface SendEmailRequest {
  subject: string;
  text: string; // только простой текст — HTML уйдёт как есть, тегами
  userIds?: string[];
  emails?: string[];
  ticketId?: string;
  kind?: string;
}

export interface EmailRecipientResult {
  email: string;
  userId?: string | null;
  status: EmailSendStatus;
}

// requested/sent — не «сколько дошло», см. notificationRepository.sendEmail.
export interface SendEmailResponse {
  requested: number;
  sent: number;
  results: EmailRecipientResult[];
}

// Одно сообщение Telegram — до 4096 символов вместе с темой (жирной первой
// строкой): tf-tg собирает «<b>тема</b>», два перевода строки и текст, 9 символов разметки.
// Длиннее BFF обрежет текст с «…», поэтому предупреждаем до отправки.
export const TELEGRAM_MESSAGE_MAX_LENGTH = 4096 - 9;

export type TelegramSendStatus =
  | 'sent' // принято в обработку, tf-tg доставит сам
  | 'rateLimited' // этому имени уже слали меньше минуты назад
  | 'userNotFound'
  | 'noTelegramOnFile' // у пользователя не указано имя в Telegram
  | 'notLinked' // имя указано, но бот не подключён («Старт» не нажат)
  | 'failed';

// Получатели — только пользователи: боту нельзя написать первым, человек
// подключает его сам, поэтому произвольных адресов тут нет.
export interface SendTelegramRequest {
  subject: string;
  text: string;
  userIds: string[];
  ticketId?: string;
  kind?: string;
}

export interface TelegramRecipientResult {
  userId: string;
  username: string | null;
  status: TelegramSendStatus;
}

export interface SendTelegramResponse {
  requested: number;
  sent: number;
  results: TelegramRecipientResult[];
}
