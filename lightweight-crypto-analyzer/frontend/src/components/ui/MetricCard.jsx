/** Stat tile: label, a headline value and an optional hint line. */
export default function MetricCard({ label, value, hint, icon: Icon, swatch }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</p>
        {Icon && <Icon className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {swatch && <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: swatch }} aria-hidden="true" />}
        <p className="truncate text-2xl font-semibold tracking-tight">{value}</p>
      </div>
      {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
    </div>
  );
}
