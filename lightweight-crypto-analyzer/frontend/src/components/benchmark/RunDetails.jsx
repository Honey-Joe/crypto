import { formatBytes, formatDateTime, formatDuration } from '../../utils/format';

/** Conditions, environment and methodology of a benchmark run. */
export default function RunDetails({ run }) {
  const { config, environment } = run;
  return (
    <details className="group rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-800 dark:bg-neutral-950/50">
      <summary className="cursor-pointer font-medium">Test conditions, environment and methodology</summary>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt className="text-neutral-500">Run</dt>
          <dd className="break-all">{formatDateTime(run.startedAt)} · {formatDuration(run.totalDurationMs)} total</dd>
          <dt className="text-neutral-500">Dataset</dt>
          <dd>{config.datasetName}</dd>
          <dt className="text-neutral-500">Message sizes</dt>
          <dd>{config.messageSizes.map(formatBytes).join(', ')}</dd>
          <dt className="text-neutral-500">Iterations</dt>
          <dd>{config.iterations} measured + {config.warmupIterations} warm-up per algorithm and size</dd>
          <dt className="text-neutral-500">Mode</dt>
          <dd>{config.mode} (random key and IV per algorithm; IV reused across iterations for timing only)</dd>
          <dt className="text-neutral-500">Node.js / V8</dt>
          <dd>{environment.nodeVersion} / {environment.v8Version}</dd>
          <dt className="text-neutral-500">OS / arch</dt>
          <dd>{environment.platform} {environment.osRelease} / {environment.arch}</dd>
          <dt className="text-neutral-500">CPU</dt>
          <dd>{environment.cpuModel} ({environment.logicalCpus} logical cores)</dd>
          <dt className="text-neutral-500">Timer</dt>
          <dd>
            resolution ≈ {formatDuration(run.timer?.resolutionMs)}, call overhead ≈ {formatDuration(run.timer?.overheadMs)}
          </dd>
          <dt className="text-neutral-500">GC control</dt>
          <dd>{environment.gcExposed ? 'Garbage collection forced before each measurement' : 'Not available (start Node with --expose-gc)'}</dd>
        </dl>
        <div className="space-y-3">
          <ol className="list-decimal space-y-1.5 pl-5 text-neutral-700 dark:text-neutral-300">
            {run.methodology?.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {run.memoryNote && <p className="text-xs text-neutral-500 dark:text-neutral-400">* {run.memoryNote}</p>}
        </div>
      </div>
    </details>
  );
}
