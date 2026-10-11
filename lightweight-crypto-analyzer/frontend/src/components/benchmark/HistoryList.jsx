import { ChartColumn, Eye, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatBytes, formatDateTime } from '../../utils/format';
import { isPassed } from '../../utils/results';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

/** Saved benchmark runs (newest first). */
export default function HistoryList({ runs, activeRunId, onView, onDelete, limit }) {
  const shown = limit ? runs.slice(0, limit) : runs;
  return (
    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {shown.map((run) => {
        const passed = run.results.filter(isPassed).length;
        return (
          <li key={run.runId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{formatDateTime(run.startedAt)}</p>
                {run.runId === activeRunId && <Badge tone="info">Showing</Badge>}
                {passed < run.results.length && <Badge tone="danger">{run.results.length - passed} failed</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {run.config.targets.map((target) => target.displayName).join(', ')} · {run.config.messageSizes.map(formatBytes).join(', ')} · {run.config.iterations} iterations · {run.config.mode}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {onView && (
                <Button variant="secondary" size="sm" icon={Eye} onClick={() => onView(run.runId)}>
                  View
                </Button>
              )}
              <Link
                to={`/comparison?run=${encodeURIComponent(run.runId)}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <ChartColumn className="size-4" aria-hidden="true" />
                Compare
              </Link>
              {onDelete && (
                <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onDelete(run.runId)} aria-label={`Delete run from ${formatDateTime(run.startedAt)}`}>
                  <span className="sr-only sm:not-sr-only">Delete</span>
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
