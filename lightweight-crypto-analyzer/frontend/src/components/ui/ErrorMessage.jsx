import { CircleAlert, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorMessage({ title = 'Something went wrong', message, onRetry, className = '' }) {
  return (
    <div role="alert" className={`flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-start dark:border-red-900/60 dark:bg-red-950/30 ${className}`}>
      <CircleAlert className="size-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-800 dark:text-red-300">{title}</p>
        {message && <p className="mt-1 text-sm break-words text-red-700 dark:text-red-300/90">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
