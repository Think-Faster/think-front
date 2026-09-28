import { ChoiceOption } from './ChoiceField';

interface ChipMultiSelectProps {
  options: ChoiceOption[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

// Несколько значений из справочника чипами. Значения не из справочника
// (записанные раньше вручную) остаются чипами и снимаются так же.
export default function ChipMultiSelect({ options, value, onChange, disabled }: ChipMultiSelectProps) {
  const extra = value.filter(item => !options.some(option => option.value === item));
  const all = [...options, ...extra.map(item => ({ value: item, label: item }))];

  function toggle(item: string) {
    onChange(value.includes(item) ? value.filter(current => current !== item) : [...value, item]);
  }

  return (
    <div className="filter-group">
      {all.map(option => {
        const active = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            className={`chip-filter ${active ? 'active' : ''}`}
            aria-pressed={active}
            onClick={() => toggle(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
