import { SearchIcon } from './icons';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchField({ value, onChange, placeholder = 'Поиск' }: SearchFieldProps) {
  return (
    <label className="search-field">
      <SearchIcon className="search-icon" />
      <input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

// Поиск по уже загруженным записям: в ручках BFF у журналов нет параметра
// поиска, поэтому совпадения ищутся среди подгруженных страниц.
export function matchesSearch(query: string, ...fields: (string | number | null | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return fields.some(field => field !== null && field !== undefined && String(field).toLowerCase().includes(needle));
}
