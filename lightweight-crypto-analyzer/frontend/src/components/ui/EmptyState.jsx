import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center dark:border-neutral-700 ${className}`}>
      <span className="rounded-full bg-neutral-100 p-3 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="max-w-md">
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
