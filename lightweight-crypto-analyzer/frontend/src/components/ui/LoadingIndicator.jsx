import { LoaderCircle } from 'lucide-react';

export default function LoadingIndicator({ label = 'Loading…', className = '' }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 py-8 text-sm text-neutral-600 dark:text-neutral-400 ${className}`}>
      <LoaderCircle className="size-5 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
