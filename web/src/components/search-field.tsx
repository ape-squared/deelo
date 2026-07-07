import { Search } from 'lucide-react';

export function SearchField({
  className = '',
  inputClassName = '',
  fieldSize = 'md',
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  fieldSize?: 'md' | 'sm';
  inputClassName?: string;
}) {
  const pad = fieldSize === 'sm' ? 'input-search-sm' : 'input-search';
  return (
    <div className={`relative ${className}`}>
      <Search
        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted ${
          fieldSize === 'sm' ? 'left-3' : 'left-3.5'
        }`}
        aria-hidden
      />
      <input className={`input ${pad} w-full ${inputClassName}`} {...props} />
    </div>
  );
}
