'use client';

export function ModuleToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      className={`module-toggle ${checked ? 'module-toggle-on' : ''} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <span className="module-toggle-thumb" />
    </button>
  );
}
