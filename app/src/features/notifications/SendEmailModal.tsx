import { FormEvent, useMemo, useState } from 'react';

import { SUBJECT_MAX_LENGTH, TEXT_MAX_LENGTH } from '../../entities/notification/types';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Modal from '../../shared/ui/Modal';
import { useUsers } from '../users/hooks/useUsers';
import { useSendEmail } from './hooks/useSendEmail';
import { emailKindOptions, emailSendStatusLabels, emailSendStatusTone } from './notificationLabels';

interface SendEmailModalProps {
  onClose: () => void;
}

function parseEmails(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,;]+/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  );
}

export default function SendEmailModal({ onClose }: SendEmailModalProps) {
  const { users } = useUsers();
  const { sendEmail, sending, error, result, reset } = useSendEmail();

  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [emailsInput, setEmailsInput] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [kind, setKind] = useState('');

  const parsedEmails = useMemo(() => parseEmails(emailsInput), [emailsInput]);
  const recipientCount = selectedUserIds.length + parsedEmails.length;
  const subjectOverLimit = subject.length > SUBJECT_MAX_LENGTH;
  const textOverLimit = text.length > TEXT_MAX_LENGTH;
  const canSubmit =
    !sending && recipientCount > 0 && subject.trim() !== '' && text.trim() !== '' && !subjectOverLimit && !textOverLimit;

  function toggleUser(userId: string) {
    setSelectedUserIds(current => (current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    await sendEmail({
      subject,
      text,
      userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      emails: parsedEmails.length > 0 ? parsedEmails : undefined,
      ticketId: ticketId || undefined,
      kind: kind || undefined,
    });
  }

  function handleComposeAnother() {
    reset();
    setSubject('');
    setText('');
    setSelectedUserIds([]);
    setEmailsInput('');
    setTicketId('');
    setKind('');
  }

  const footer = !result ? (
    <>
      <Button type="button" onClick={onClose} disabled={sending}>
        Отмена
      </Button>

      <Button type="submit" form="send-email-form" variant="primary" disabled={!canSubmit}>
        {sending ? 'Отправка…' : `Отправить (${recipientCount})`}
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
    <Modal title="Отправить письмо" onClose={onClose} footer={footer}>
      {!result ? (
        <form className="form-card" id="send-email-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <span>Получатели — пользователи</span>

            <div className="recipient-list">
              {users.length === 0 && <span className="recipient-empty">Пользователей пока нет</span>}

              {users.map(user => (
                <label key={user.id} className={`recipient-item ${!user.email ? 'no-email' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    disabled={!user.email || sending}
                  />
                  <span>
                    {user.lastName} {user.firstName}
                    {!user.email && <span className="recipient-warning"> — нет email</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label>
            Получатели — произвольные адреса (по одному на строке или через запятую)
            <textarea
              rows={3}
              value={emailsInput}
              onChange={event => setEmailsInput(event.target.value)}
              disabled={sending}
              placeholder="dispatcher@example.com"
            />
          </label>

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
            <div className={`char-counter ${textOverLimit ? 'over' : ''}`}>
              {text.length} / {TEXT_MAX_LENGTH}
              {textOverLimit && ' — сократите текст'}
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

          {recipientCount === 0 && <div className="status-note rej">Выберите хотя бы одного получателя.</div>}
        </form>
      ) : (
        <div className="email-results">
          <p className="pd-section-title">
            Принято в обработку {result.sent} из {result.requested}
          </p>

          {result.results.map(item => (
            <div className="hist-item" key={`${item.userId ?? ''}:${item.email}`}>
              <span>{item.email}</span>
              <Badge tone={emailSendStatusTone(item.status)}>{emailSendStatusLabels[item.status]}</Badge>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
