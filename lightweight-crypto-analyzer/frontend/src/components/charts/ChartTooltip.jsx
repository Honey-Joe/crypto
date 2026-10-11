/**
 * Tooltip content for Recharts. The value leads (bold), the series name follows;
 * each row is keyed with a short line in the series colour.
 */
export default function ChartTooltip({ active, payload, label, formatValue, colorForEntry, title }) {
  if (!active || !payload?.length) return null;
  const heading = title ? title(label, payload) : label;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-900">
      {heading && <p className="mb-1 text-neutral-500 dark:text-neutral-400">{heading}</p>}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={entry.dataKey + String(entry.name)} className="flex items-center gap-2">
            <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorForEntry(entry) }} aria-hidden="true" />
            <span className="font-semibold text-neutral-900 tabular dark:text-neutral-50">{formatValue(entry.value)}</span>
            <span className="text-neutral-600 dark:text-neutral-400">{entry.payload?.name && payload.length === 1 ? entry.payload.name : entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
