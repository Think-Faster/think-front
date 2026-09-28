import { useState } from 'react';

export interface ChoiceOption {
  value: string;
  label: string;
}

// Справочник без кодов (значение = подпись), §11 доменного документа.
export function textChoiceOptions(labels: string[]): ChoiceOption[] {
  return labels.map(label => ({ value: label, label }));
}

interface ChoiceFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: ChoiceOption[];
  // Справочник открытый (§11 доменного документа: «и т.д.», «прочие») —
  // можно вписать своё значение пунктом «другое…».
  allowCustom?: boolean;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

const CUSTOM = '\u0000custom';

// Выбор из справочника вместо ручного ввода. Значение не из списка (старые
// данные, своё) показывается как «другое…» с полем рядом и не теряется.
export default function ChoiceField({
  value,
  onChange,
  options,
  allowCustom = false,
  placeholder = '— выбрать —',
  disabled,
  required,
}: ChoiceFieldProps) {
  const known = options.some(option => option.value === value);
  const [customMode, setCustomMode] = useState(value !== '' && !known);
  const custom = customMode || (value !== '' && !known);

  // Значение не из справочника без allowCustom всё равно показываем, чтобы
  // select не подменил его первым пунктом.
  const shown = !allowCustom && value !== '' && !known ? [...options, { value, label: value }] : options;

  function handleSelect(next: string) {
    if (next === CUSTOM) {
      setCustomMode(true);
      onChange('');
      return;
    }
    setCustomMode(false);
    onChange(next);
  }

  return (
    <span className="choice-field">
      <select
        value={allowCustom && custom ? CUSTOM : value}
        onChange={event => handleSelect(event.target.value)}
        disabled={disabled}
        required={required && !(allowCustom && custom)}
      >
        <option value="">{placeholder}</option>
        {shown.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {allowCustom && <option value={CUSTOM}>другое…</option>}
      </select>

      {allowCustom && custom && (
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          placeholder="своё значение"
          aria-label="Своё значение"
          autoFocus={customMode && value === ''}
        />
      )}
    </span>
  );
}
