import FieldWrapper from './FieldWrapper';
import { FIELD_BASE, fieldBorder } from './fieldStyles';

export default function InputField({ id, label, hint, error, trailing, className = '', inputClassName = '', ...props }) {
  return (
    <div className={className}>
      <FieldWrapper id={id} label={label} hint={hint} error={error} trailing={trailing}>
        <input
          id={id}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`h-10 ${FIELD_BASE} ${fieldBorder(error)} ${inputClassName}`}
          {...props}
        />
      </FieldWrapper>
    </div>
  );
}
