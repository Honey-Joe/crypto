export default function FieldWrapper({ id, label, hint, error, trailing, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {(label || trailing) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={id} className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {label}
            </label>
          )}
          {trailing}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-neutral-500 dark:text-neutral-400">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
