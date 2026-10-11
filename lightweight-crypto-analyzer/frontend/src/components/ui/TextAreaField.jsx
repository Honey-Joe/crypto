import FieldWrapper from './FieldWrapper';
import { FIELD_BASE, fieldBorder } from './fieldStyles';

export default function TextAreaField({ id, label, hint, error, trailing, rows = 4, className = '', inputClassName = '', ...props }) {
  return (
    <div className={className}>
      <FieldWrapper id={id} label={label} hint={hint} error={error} trailing={trailing}>
        <textarea
          id={id}
          rows={rows}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`py-2 ${FIELD_BASE} ${fieldBorder(error)} resize-y ${inputClassName}`}
          {...props}
        />
      </FieldWrapper>
    </div>
  );
}
