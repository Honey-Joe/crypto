import { CircleCheck, CircleX } from 'lucide-react';
import useChartTheme from '../../hooks/useChartTheme';
import { formatBytes, formatDuration, formatThroughput } from '../../utils/format';
import { RESULT_METRICS } from '../../utils/metrics';
import { isPassed, sortResults } from '../../utils/results';
import Badge from '../ui/Badge';

const th = 'px-3 py-2 text-left text-xs font-semibold whitespace-nowrap text-neutral-600 dark:text-neutral-400';
const td = 'px-3 py-2 align-top whitespace-nowrap tabular';

function TimeCell({ stats }) {
  if (!stats) return <span className="text-neutral-400">–</span>;
  return (
    <div>
      <div className="font-medium">{formatDuration(stats.meanMs)}</div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        med {formatDuration(stats.medianMs)} · min {formatDuration(stats.minMs)}
      </div>
    </div>
  );
}

/**
 * Detailed benchmark/comparison table. `compact` hides the less important columns.
 * Every value plotted in a chart is also reachable here (table view for accessibility).
 */
export default function ResultsTable({ results, compact = false, statistic = 'mean', caption }) {
  const { colorFor } = useChartTheme();
  const rows = sortResults(results);

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-neutral-50 dark:bg-neutral-950/60">
          <tr>
            <th scope="col" className={th}>Algorithm</th>
            <th scope="col" className={th}>Message</th>
            <th scope="col" className={th}>Round trip</th>
            <th scope="col" className={th}>Encryption{compact ? ' (mean)' : ''}</th>
            <th scope="col" className={th}>Decryption{compact ? ' (mean)' : ''}</th>
            <th scope="col" className={th}>Throughput ({statistic})</th>
            {!compact && <th scope="col" className={th}>Key setup</th>}
            {!compact && <th scope="col" className={th}>Ciphertext (raw)</th>}
            {!compact && <th scope="col" className={th}>Round keys</th>}
            {!compact && <th scope="col" className={th}>Heap growth*</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((result) => {
            const passed = isPassed(result);
            return (
              <tr key={result.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colorFor(result.algorithm) }} aria-hidden="true" />
                    <span className="font-medium">{result.displayName}</span>
                  </div>
                  <div className="mt-0.5 flex gap-1">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {result.blockBits}-bit block · {result.keyBits}-bit key · {result.mode}
                    </span>
                  </div>
                </td>
                <td className={td}>{formatBytes(result.messageSize)}</td>
                <td className={td}>
                  {passed ? (
                    <Badge tone="success" icon={CircleCheck}>Verified</Badge>
                  ) : (
                    <div className="max-w-56 whitespace-normal">
                      <Badge tone="danger" icon={CircleX}>Failed</Badge>
                      {result.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{result.error}</p>}
                    </div>
                  )}
                </td>
                {compact ? (
                  <>
                    <td className={td}>{formatDuration(result.encrypt?.meanMs)}</td>
                    <td className={td}>{formatDuration(result.decrypt?.meanMs)}</td>
                  </>
                ) : (
                  <>
                    <td className={td}><TimeCell stats={result.encrypt} /></td>
                    <td className={td}><TimeCell stats={result.decrypt} /></td>
                  </>
                )}
                <td className={td}>
                  {passed ? (
                    <div>
                      <div className="font-medium">{formatThroughput(RESULT_METRICS.throughput.get(result, statistic))}</div>
                      {!compact && <div className="text-xs text-neutral-500 dark:text-neutral-400">dec {formatThroughput(RESULT_METRICS.decryptThroughput.get(result, statistic))}</div>}
                    </div>
                  ) : (
                    '–'
                  )}
                </td>
                {!compact && <td className={td}>{formatDuration(result.keySetup?.meanMs)}</td>}
                {!compact && (
                  <td className={td}>
                    <div>{formatBytes(result.ciphertext?.rawBytes)}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      +{result.ciphertext?.overheadBytes ?? '–'} B (IV {result.ciphertext?.ivBytes}, pad {result.ciphertext?.paddingBytes})
                    </div>
                  </td>
                )}
                {!compact && (
                  <td className={td}>
                    <div>{formatBytes(result.memory?.roundKeyBytes)}</div>
                    {result.memory?.lookupTableBytes > 0 && (
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">+ {formatBytes(result.memory.lookupTableBytes)} tables</div>
                    )}
                  </td>
                )}
                {!compact && <td className={td}>{formatBytes(result.memory?.heapUsedDeltaBytes)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
