import EmptyState from '../ui/EmptyState';

/** Card wrapper for a chart: title, optional subtitle/controls, and an empty state. */
export default function ChartContainer({ title, subtitle, actions, isEmpty, emptyMessage = 'No data for the current selection.', footer, children }) {
  return (
    <figure className="flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <figcaption className="min-w-0">
          <p className="font-semibold">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </figcaption>
        {actions}
      </div>
      {isEmpty ? <EmptyState title="Nothing to show" description={emptyMessage} /> : children}
      {footer && <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{footer}</p>}
    </figure>
  );
}
