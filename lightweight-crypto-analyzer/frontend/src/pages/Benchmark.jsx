import { FlaskConical, History, Play, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ExportButtons from '../components/benchmark/ExportButtons';
import HistoryList from '../components/benchmark/HistoryList';
import RunDetails from '../components/benchmark/RunDetails';
import RunSummary from '../components/benchmark/RunSummary';
import ChartLegend from '../components/charts/ChartLegend';
import ResultBarChart from '../components/charts/ResultBarChart';
import ThroughputBySizeChart from '../components/charts/ThroughputBySizeChart';
import ResultsTable from '../components/tables/ResultsTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Callout from '../components/ui/Callout';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorMessage from '../components/ui/ErrorMessage';
import InputField from '../components/ui/InputField';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import PageHeader from '../components/ui/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import SelectField from '../components/ui/SelectField';
import TextAreaField from '../components/ui/TextAreaField';
import { useAlgorithms, useBenchmarkHistory, useToast } from '../hooks/useAppContext';
import useChartTheme from '../hooks/useChartTheme';
import { getBenchmarkOptions, runBenchmark } from '../services/benchmarkService';
import { ALGORITHM_ORDER, MESSAGE_SIZE_PRESETS } from '../utils/constants';
import { getErrorMessage } from '../utils/errors';
import { formatBytes, formatDateTime, formatDuration } from '../utils/format';
import { isPassed, messageSizesOf } from '../utils/results';

const FALLBACK_LIMITS = {
  maxTargets: 9,
  maxMessageSizes: 6,
  minMessageSize: 1,
  maxMessageSize: 262144,
  maxIterations: 2000,
  maxWarmupIterations: 500,
  maxBytesPerTarget: 4 * 1024 * 1024,
  maxCustomTextChars: 4096,
};

const FALLBACK_DATASETS = [
  { id: 'random', name: 'Random bytes' },
  { id: 'text', name: 'English text' },
  { id: 'sensor', name: 'IoT sensor records' },
  { id: 'custom', name: 'Custom text' },
];

const targetKey = (algorithm, variant) => `${algorithm}:${variant}`;

function validateConfig({ targets, sizes, iterations, warmup, dataset, customText }, limits) {
  const errors = {};
  if (targets.length === 0) errors.targets = 'Select at least one algorithm variant.';
  if (targets.length > limits.maxTargets) errors.targets = `Select at most ${limits.maxTargets} variants.`;
  if (sizes.length === 0) errors.sizes = 'Select at least one message size.';
  if (sizes.length > limits.maxMessageSizes) errors.sizes = `Select at most ${limits.maxMessageSizes} message sizes.`;
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > limits.maxIterations) {
    errors.iterations = `Enter a whole number from 1 to ${limits.maxIterations}.`;
  }
  if (!Number.isInteger(warmup) || warmup < 0 || warmup > limits.maxWarmupIterations) {
    errors.warmup = `Enter a whole number from 0 to ${limits.maxWarmupIterations}.`;
  }
  if (!errors.iterations && !errors.warmup) {
    const tooBig = sizes.find((size) => size * (iterations + warmup) > limits.maxBytesPerTarget);
    if (tooBig) {
      const allowed = Math.max(0, Math.floor(limits.maxBytesPerTarget / tooBig) - warmup);
      errors.iterations = `${formatBytes(tooBig)} × ${iterations + warmup} iterations exceeds the ${formatBytes(limits.maxBytesPerTarget)} per-algorithm limit; use at most ${allowed} iterations or a smaller size.`;
    }
  }
  if (dataset === 'custom' && !customText) errors.customText = 'Enter the custom text to repeat.';
  if (dataset === 'custom' && customText.length > limits.maxCustomTextChars) errors.customText = `At most ${limits.maxCustomTextChars} characters.`;
  return errors;
}

function TargetSelector({ algorithms, selected, onToggle, onPreset, error }) {
  const { colorFor } = useChartTheme();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Algorithms and variants</p>
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={() => onPreset('default')}>One per algorithm</Button>
          <Button variant="ghost" size="sm" onClick={() => onPreset('all')}>All variants</Button>
          <Button variant="ghost" size="sm" onClick={() => onPreset('none')}>Clear</Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {algorithms.map((algorithm) => (
          <fieldset key={algorithm.id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: colorFor(algorithm.id) }} aria-hidden="true" />
              {algorithm.name}
            </legend>
            <div className="flex flex-col gap-1.5">
              {algorithm.variants.map((variant) => {
                const key = targetKey(algorithm.id, variant.id);
                return (
                  <label key={key} className={`flex items-center gap-2 text-sm ${variant.verified ? '' : 'opacity-50'}`}>
                    <input
                      type="checkbox"
                      className="size-4 rounded accent-indigo-600"
                      checked={selected.includes(key)}
                      onChange={() => onToggle(key)}
                      disabled={!variant.verified}
                    />
                    <span>{variant.name}</span>
                    {variant.blockBits <= 32 && <Badge tone="warning">32-bit block</Badge>}
                    {!variant.verified && <Badge tone="danger">failed self-test</Badge>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function SizeSelector({ sizes, onChange, limits, error }) {
  const [custom, setCustom] = useState('');
  const customValue = Number(custom);
  const customValid = Number.isInteger(customValue) && customValue >= limits.minMessageSize && customValue <= limits.maxMessageSize;

  function toggle(size) {
    onChange(sizes.includes(size) ? sizes.filter((item) => item !== size) : [...sizes, size].sort((a, b) => a - b));
  }

  function addCustom() {
    if (!customValid || sizes.includes(customValue)) return;
    onChange([...sizes, customValue].sort((a, b) => a - b));
    setCustom('');
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Message sizes</p>
      <div className="flex flex-wrap gap-2">
        {[...new Set([...MESSAGE_SIZE_PRESETS, ...sizes])].sort((a, b) => a - b).map((size) => {
          const active = sizes.includes(size);
          return (
            <button
              key={size}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(size)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              {formatBytes(size)}
              {active && <X className="size-3" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="flex max-w-sm items-end gap-2">
        <InputField
          id="custom-size"
          className="flex-1"
          label="Custom size (bytes)"
          type="number"
          min={limits.minMessageSize}
          max={limits.maxMessageSize}
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCustom();
            }
          }}
          placeholder={`${limits.minMessageSize}–${limits.maxMessageSize}`}
        />
        <Button variant="secondary" icon={Plus} onClick={addCustom} disabled={!customValid}>
          Add
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Up to {limits.maxMessageSizes} sizes. Every algorithm encrypts exactly the same bytes for each size.</p>
      )}
    </div>
  );
}

export default function Benchmark() {
  const toast = useToast();
  const { algorithms, loading: algorithmsLoading, error: algorithmsError, reload } = useAlgorithms();
  const { runs, addRun, removeRun, clearRuns, persisted } = useBenchmarkHistory();

  const [options, setOptions] = useState({ limits: FALLBACK_LIMITS, datasets: FALLBACK_DATASETS });
  const [selected, setSelected] = useState(null);
  const [sizes, setSizes] = useState([64, 1024, 16384]);
  const [iterations, setIterations] = useState('200');
  const [warmup, setWarmup] = useState('50');
  const [mode, setMode] = useState('CBC');
  const [dataset, setDataset] = useState('random');
  const [customText, setCustomText] = useState('Temperature=32.5;Humidity=68;');
  const [submitted, setSubmitted] = useState(false);
  const [runState, setRunState] = useState({ loading: false, error: null });
  const [activeRunId, setActiveRunId] = useState(null);
  const [chartSize, setChartSize] = useState(null);

  useEffect(() => {
    getBenchmarkOptions()
      .then((data) => setOptions({ limits: data.limits, datasets: data.datasets }))
      .catch(() => {
        // The fallback limits mirror the server defaults; the server still validates every run.
      });
  }, []);

  const sortedAlgorithms = useMemo(
    () => [...algorithms].sort((a, b) => ALGORITHM_ORDER.indexOf(a.id) - ALGORITHM_ORDER.indexOf(b.id)),
    [algorithms],
  );

  const defaultTargets = useMemo(() => sortedAlgorithms.map((algorithm) => targetKey(algorithm.id, algorithm.defaultVariant)), [sortedAlgorithms]);
  const targets = selected ?? defaultTargets;

  const activeRun = runs.find((run) => run.runId === activeRunId) ?? runs[0] ?? null;
  const runSizes = messageSizesOf(activeRun);
  const shownSize = runSizes.includes(chartSize) ? chartSize : runSizes[runSizes.length - 1];
  const resultsAtSize = activeRun ? activeRun.results.filter((result) => result.messageSize === shownSize) : [];

  const config = {
    targets,
    sizes,
    iterations: Number(iterations),
    warmup: Number(warmup),
    dataset,
    customText,
  };
  const errors = validateConfig(config, options.limits);
  const hasErrors = Object.keys(errors).length > 0;
  const totalBytes = sizes.reduce((sum, size) => sum + size, 0) * (config.iterations + config.warmup || 0) * targets.length;

  function toggleTarget(key) {
    setSelected((current) => {
      const base = current ?? defaultTargets;
      return base.includes(key) ? base.filter((item) => item !== key) : [...base, key];
    });
  }

  function presetTargets(preset) {
    if (preset === 'default') setSelected(defaultTargets);
    if (preset === 'none') setSelected([]);
    if (preset === 'all') {
      setSelected(sortedAlgorithms.flatMap((algorithm) => algorithm.variants.filter((variant) => variant.verified).map((variant) => targetKey(algorithm.id, variant.id))));
    }
  }

  async function handleRun(event) {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    setRunState({ loading: true, error: null });
    try {
      const result = await runBenchmark({
        targets: targets.map((key) => {
          const [algorithm, variant] = key.split(':');
          return { algorithm, variant };
        }),
        messageSizes: sizes,
        iterations: config.iterations,
        warmupIterations: config.warmup,
        mode,
        dataset,
        ...(dataset === 'custom' ? { customText } : {}),
      });
      addRun(result);
      setActiveRunId(result.runId);
      setChartSize(null);
      setRunState({ loading: false, error: null });
      const failed = result.results.filter((item) => !isPassed(item)).length;
      if (failed) toast.warning('Benchmark finished with failures', `${failed} result(s) failed verification and are excluded from rankings.`);
      else toast.success('Benchmark complete', `${result.results.length} results verified in ${formatDuration(result.totalDurationMs)}.`);
    } catch (error) {
      setRunState({ loading: false, error: getErrorMessage(error) });
    }
  }

  if (algorithmsLoading) return <LoadingIndicator label="Loading algorithms from the API…" />;
  if (algorithmsError) return <ErrorMessage title="Could not load algorithms" message={algorithmsError} onRetry={reload} />;

  const showErrors = submitted;
  const legendItems = sortedAlgorithms
    .filter((algorithm) => resultsAtSize.some((result) => result.algorithm === algorithm.id))
    .map((algorithm) => ({ key: algorithm.id, label: algorithm.name, algorithm: algorithm.id }));
  const runWarnings = activeRun ? [...new Set(activeRun.results.flatMap((result) => result.warnings ?? []))] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Benchmark"
        description="Measure encryption and decryption time, throughput, ciphertext size and memory for the selected algorithms using identical inputs. All numbers come from the server's measurements on this machine."
      />

      <Card title="Benchmark configuration" icon={FlaskConical}>
        <form onSubmit={handleRun} className="space-y-6" noValidate>
          <TargetSelector algorithms={sortedAlgorithms} selected={targets} onToggle={toggleTarget} onPreset={presetTargets} error={showErrors ? errors.targets : null} />
          <SizeSelector sizes={sizes} onChange={setSizes} limits={options.limits} error={showErrors ? errors.sizes : null} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              id="dataset"
              label="Plaintext dataset"
              value={dataset}
              onChange={(event) => setDataset(event.target.value)}
              options={options.datasets.map((item) => ({ value: item.id, label: item.name }))}
            />
            <InputField
              id="iterations"
              label="Measured iterations"
              type="number"
              min={1}
              max={options.limits.maxIterations}
              value={iterations}
              onChange={(event) => setIterations(event.target.value)}
              error={showErrors || iterations !== '' ? errors.iterations : null}
            />
            <InputField
              id="warmup"
              label="Warm-up iterations"
              type="number"
              min={0}
              max={options.limits.maxWarmupIterations}
              value={warmup}
              onChange={(event) => setWarmup(event.target.value)}
              error={showErrors || warmup !== '' ? errors.warmup : null}
              hint="Executed but not measured"
            />
            <div>
              <p className="mb-1.5 text-sm font-medium">Mode</p>
              <SegmentedControl
                ariaLabel="Mode of operation"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'CBC', label: 'CBC' },
                  { value: 'CTR', label: 'CTR' },
                  { value: 'ECB', label: 'ECB' },
                ]}
              />
            </div>
          </div>

          {dataset === 'custom' && (
            <TextAreaField
              id="custom-text"
              label="Custom text"
              rows={2}
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              error={showErrors ? errors.customText : null}
              hint="Repeated or truncated to each message size."
            />
          )}

          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {targets.length} variant(s) × {sizes.length} size(s) · about {formatBytes(totalBytes || 0)} encrypted and decrypted, timed per iteration on the server.
            </p>
            <Button type="submit" icon={Play} loading={runState.loading}>
              {runState.loading ? 'Running…' : 'Run benchmark'}
            </Button>
          </div>
        </form>
      </Card>

      {runState.loading && (
        <Card>
          <LoadingIndicator label="Running the benchmark on the server. Algorithms are measured one after another; large runs can take several seconds." />
        </Card>
      )}
      {runState.error && <ErrorMessage title="Benchmark failed" message={runState.error} />}

      {!activeRun && !runState.loading && (
        <EmptyState
          icon={FlaskConical}
          title="No benchmark results yet"
          description="Choose algorithms and message sizes above, then run the benchmark. Results appear here and are saved in this browser's history."
        />
      )}

      {activeRun && (
        <div className={`space-y-6 transition-opacity ${runState.loading ? 'opacity-50' : ''}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Results</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Run of {formatDateTime(activeRun.startedAt)} · {activeRun.config.iterations} iterations · {activeRun.config.mode} · {activeRun.config.datasetName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportButtons results={activeRun.results} json={activeRun} prefix="benchmark-run" />
            </div>
          </div>

          {runSizes.length > 1 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">Message size for charts</span>
              <SegmentedControl ariaLabel="Message size" size="sm" value={shownSize} onChange={setChartSize} options={runSizes.map((size) => ({ value: size, label: formatBytes(size) }))} />
            </div>
          )}

          <RunSummary results={activeRun.results} messageSize={shownSize} />

          {legendItems.length > 1 && <ChartLegend items={legendItems} />}
          <div className="grid gap-6 lg:grid-cols-2">
            <ResultBarChart results={resultsAtSize} metric="encrypt" title={`Encryption time · ${formatBytes(shownSize)}`} subtitle="Mean per message · lower is better" />
            <ResultBarChart results={resultsAtSize} metric="decrypt" title={`Decryption time · ${formatBytes(shownSize)}`} subtitle="Mean per message · lower is better" />
            <ResultBarChart results={resultsAtSize} metric="throughput" title={`Encryption throughput · ${formatBytes(shownSize)}`} subtitle="Plaintext bytes / mean encryption time · higher is better" />
            <ResultBarChart
              results={resultsAtSize}
              metric="ciphertext"
              title={`Raw ciphertext size · ${formatBytes(shownSize)}`}
              subtitle="Bytes including IV and padding (before hex/Base64 encoding)"
            />
          </div>
          {runSizes.length > 1 && <ThroughputBySizeChart results={activeRun.results} />}

          {runWarnings.length > 0 && (
            <Callout tone="warning" title="Measurement notes">
              <ul className="list-disc space-y-1 pl-4">
                {runWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Callout>
          )}

          <Card title="Detailed results" description="All message sizes. Mean is the headline figure; median and minimum are shown beneath it.">
            <ResultsTable results={activeRun.results} caption="Benchmark results" />
          </Card>

          <RunDetails run={activeRun} />
        </div>
      )}

      <Card
        title="Benchmark history"
        icon={History}
        description={`Saved in this browser only (up to 20 runs).${persisted ? '' : ' Storage is full or unavailable, so older runs may not be kept.'}`}
        actions={
          runs.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => {
                if (window.confirm('Delete all saved benchmark runs from this browser?')) clearRuns();
              }}
            >
              Clear history
            </Button>
          )
        }
      >
        {runs.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No saved runs yet.</p>
        ) : (
          <HistoryList runs={runs} activeRunId={activeRun?.runId} onView={(id) => { setActiveRunId(id); setChartSize(null); }} onDelete={removeRun} />
        )}
      </Card>
    </div>
  );
}
