import { FormEvent, useState } from 'react';

import { SUBJECT_MAX_LENGTH, TELEGRAM_MESSAGE_MAX_LENGTH } from '../../entities/notification/types';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Modal from '../../shared/ui/Modal';
import { useUsers } from '../users/hooks/useUsers';
import { useSendTelegram } from './hooks/useSendTelegram';
import { emailKindOptions, telegramSendStatusLabels, telegramSendStatusTone } from './notificationLabels';

interface SendTelegramModalProps {
  onClose: () => void;
}

export default function SendTelegramModal({ onClose }: SendTelegramModalProps) {
  const { users } = useUsers();
  const { sendTelegram, sending, error, result, reset } = useSendTelegram();

  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [ticketId, setTicketId] = useState('');
  const [kind, setKind] = useState('');

  const subjectOverLimit = subject.length > SUBJECT_MAX_LENGTH;
  const messageLength = subject.length + text.length;
  const messageOverLimit = messageLength > TELEGRAM_MESSAGE_MAX_LENGTH;
  const canSubmit =
    !sending &&
    selectedUserIds.length > 0 &&
    subject.trim() !== '' &&
    text.trim() !== '' &&
    !subjectOverLimit &&
    !messageOverLimit;

  const nameById = new Map(users.map(user => [user.id, `${user.lastName} ${user.firstName}`]));

  function toggleUser(userId: string) {
    setSelectedUserIds(current => (current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    await sendTelegram({
      subject,
      text,
      userIds: selectedUserIds,
      ticketId: ticketId || undefined,
      kind: kind || undefined,
    });
  }

  function handleComposeAnother() {
    reset();
    setSubject('');
    setText('');
    setSelectedUserIds([]);
    setTicketId('');
    setKind('');
  }

  const footer = !result ? (
    <>
      <Button type="button" onClick={onClose} disabled={sending}>
        Отмена
      </Button>

      <Button type="submit" form="send-telegram-form" variant="primary" disabled={!canSubmit}>
        {sending ? 'Отправка…' : `Отправить (${selectedUserIds.length})`}
      </Button>
    </>
  ) : (
    <>
      <Button type="button" onClick={handleComposeAnother}>
        Отправить ещё одно
      </Button>

      <Button type="button" variant="primary" onClick={onClose}>
        Готово
      </Button>
    </>
  );

  return (
    <Modal title="Отправить в Telegram" onClose={onClose} footer={footer}>
      {!result ? (
        <form className="form-card" id="send-telegram-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <span>Получатели</span>

            <div className="recipient-list">
              {users.length === 0 && <span className="recipient-empty">Пользователей пока нет</span>}

              {users.map(user => (
                <label key={user.id} className={`recipient-item ${!user.telegram ? 'no-email' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    disabled={!user.telegram || sending}
                  />
                  <span>
                    {user.lastName} {user.firstName}
                    {user.telegram ? (
                      <span className="d"> — @{user.telegram}</span>
                    ) : (
                      <span className="recipient-warning"> — нет Telegram</span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            <div className="status-note">
              Дойдёт тем, кто открыл бота и нажал «Старт» — это делает сам человек, из профиля.
            </div>
          </div>

          <div className="form-field">
            <label>
              Тема
              <input value={subject} onChange={event => setSubject(event.target.value)} disabled={sending} required />
            </label>
            <div className={`char-counter ${subjectOverLimit ? 'over' : ''}`}>
              {subject.length} / {SUBJECT_MAX_LENGTH}
              {subjectOverLimit && ' — сократите тему'}
            </div>
          </div>

          <div className="form-field">
            <label>
              Текст
              <textarea rows={8} value={text} onChange={event => setText(event.target.value)} disabled={sending} required />
            </label>
            <div className={`char-counter ${messageOverLimit ? 'over' : ''}`}>
              {messageLength} / {TELEGRAM_MESSAGE_MAX_LENGTH} с темой
              {messageOverLimit && ' — не влезет в одно сообщение Telegram'}
            </div>
          </div>

          <label>
            Тикет (необязательно, только для логов)
            <input value={ticketId} onChange={event => setTicketId(event.target.value)} disabled={sending} />
          </label>

          <label>
            Тип (необязательно, только для логов)
            <select value={kind} onChange={event => setKind(event.target.value)} disabled={sending}>
              <option value="">— не указан —</option>
              {emailKindOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {error && <div className="login-error">{error}</div>}

          {selectedUserIds.length === 0 && <div className="status-note rej">Выберите хотя бы одного получателя.</div>}
        </form>
      ) : (
        <div className="email-results">
          <p className="pd-section-title">
            Принято в обработку {result.sent} из {result.requested}
          </p>

          {result.results.map(item => (
            <div className="hist-item" key={item.userId}>
              <span>
                {nameById.get(item.userId) ?? item.userId}
                {item.username && <span className="d"> @{item.username}</span>}
              </span>
              <Badge tone={telegramSendStatusTone(item.status)}>{telegramSendStatusLabels[item.status]}</Badge>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
