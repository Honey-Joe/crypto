import { ChevronDown } from 'lucide-react';
import FieldWrapper from './FieldWrapper';
import { FIELD_BASE, fieldBorder } from './fieldStyles';

/** Native <select> with consistent styling. options: [{ value, label, disabled? }] */
export default function SelectField({ id, label, hint, error, options, className = '', ...props }) {
  return (
    <div className={className}>
      <FieldWrapper id={id} label={label} hint={hint} error={error}>
        <div className="relative">
          <select
            id={id}
            aria-invalid={Boolean(error) || undefined}
            className={`h-10 appearance-none pr-9 ${FIELD_BASE} ${fieldBorder(error)}`}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
        </div>
      </FieldWrapper>
    </div>
  );
}
