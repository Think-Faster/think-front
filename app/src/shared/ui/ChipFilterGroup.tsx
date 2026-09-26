interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipFilterGroupProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function ChipFilterGroup<T extends string>({
  options,
  value,
  onChange,
}: ChipFilterGroupProps<T>) {
  return (
    <div className="filter-group">
      {options.map(option => (
        <button
          key={option.value}
          className={`chip-filter ${option.value === value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
