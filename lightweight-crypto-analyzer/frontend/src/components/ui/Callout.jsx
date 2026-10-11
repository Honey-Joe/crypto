import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

const TONES = {
  info: { icon: Info, box: 'border-indigo-200 bg-indigo-50 dark:border-indigo-900/60 dark:bg-indigo-950/30', title: 'text-indigo-900 dark:text-indigo-200', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  warning: { icon: TriangleAlert, box: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30', title: 'text-amber-900 dark:text-amber-200', iconColor: 'text-amber-600 dark:text-amber-400' },
  danger: { icon: CircleAlert, box: 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30', title: 'text-red-900 dark:text-red-200', iconColor: 'text-red-600 dark:text-red-400' },
  success: { icon: CircleCheck, box: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30', title: 'text-emerald-900 dark:text-emerald-200', iconColor: 'text-emerald-600 dark:text-emerald-400' },
};

/** A tinted note. The icon + title carry the meaning, never colour alone. */
export default function Callout({ tone = 'info', title, icon, children, className = '' }) {
  const style = TONES[tone];
  const Icon = icon ?? style.icon;
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${style.box} ${className}`}>
      <Icon className={`mt-0.5 size-5 shrink-0 ${style.iconColor}`} aria-hidden="true" />
      <div className="min-w-0 text-sm text-neutral-700 dark:text-neutral-300">
        {title && <p className={`font-semibold ${style.title}`}>{title}</p>}
        <div className={title ? 'mt-1 space-y-1' : 'space-y-1'}>{children}</div>
      </div>
    </div>
  );
}
