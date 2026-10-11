/** Single-choice button group. options: [{ value, label, icon? }] */
export default function SegmentedControl({ options, value, onChange, ariaLabel, size = 'md', className = '' }) {
  const padding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 ${padding} ${
              selected
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-50'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
            }`}
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
