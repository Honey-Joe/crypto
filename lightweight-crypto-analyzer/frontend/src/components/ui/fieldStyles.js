export const FIELD_BASE =
  'w-full rounded-lg border bg-white px-3 text-sm text-neutral-900 shadow-xs placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-0 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:disabled:bg-neutral-900';

export function fieldBorder(hasError) {
  return hasError
    ? 'border-red-400 focus:outline-red-500 dark:border-red-700'
    : 'border-neutral-300 focus:outline-indigo-500 dark:border-neutral-700';
}
