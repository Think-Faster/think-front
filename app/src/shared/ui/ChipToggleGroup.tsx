interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipToggleGroupProps<T extends string> {
  options: ChipOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
}

// Как ChipFilterGroup, только множественный выбор (переключает элемент
// вкл/выкл, а не заменяет весь выбор одним значением).
export default function ChipToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: ChipToggleGroupProps<T>) {
  function toggle(option: T) {
    onChange(value.includes(option) ? value.filter(item => item !== option) : [...value, option]);
  }

  return (
    <div className="filter-group">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={`chip-filter ${value.includes(option.value) ? 'active' : ''}`}
          onClick={() => toggle(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
