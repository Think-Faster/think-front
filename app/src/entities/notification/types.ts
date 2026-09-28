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
