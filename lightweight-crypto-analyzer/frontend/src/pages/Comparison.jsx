import { ChartColumn, FlaskConical } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ExportButtons from '../components/benchmark/ExportButtons';
import ChartLegend from '../components/charts/ChartLegend';
import ResultBarChart from '../components/charts/ResultBarChart';
import RecommendationPanel from '../components/comparison/RecommendationPanel';
import ResultsTable from '../components/tables/ResultsTable';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import SelectField from '../components/ui/SelectField';
import { useBenchmarkHistory } from '../hooks/useAppContext';
import useChartTheme from '../hooks/useChartTheme';
import { compareResults } from '../services/comparisonService';
import { ALGORITHM_ORDER, WEIGHT_PRESETS } from '../utils/constants';
import { getErrorMessage } from '../utils/errors';
import { formatBytes, formatDateTime } from '../utils/format';
import { messageSizesOf, sortResults } from '../utils/results';

const STATISTIC_OPTIONS = [
  { value: 'mean', label: 'Mean' },
  { value: 'median', label: 'Median' },
  { value: 'min', label: 'Minimum' },
];

function VariantFilter({ results, hidden, onToggle }) {
  const { colorFor } = useChartTheme();
  const names = sortResults(results).map((result) => ({ name: result.displayName, algorithm: result.algorithm }));
  const unique = names.filter((item, index) => names.findIndex((other) => other.name === item.name) === index);
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium">Algorithms</legend>
      <div className="flex flex-wrap gap-2">
        {unique.map(({ name, algorithm }) => {
          const active = !hidden.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(name)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-neutral-400 bg-white text-neutral-900 dark:border-neutral-500 dark:bg-neutral-950 dark:text-neutral-50'
                  : 'border-neutral-200 text-neutral-400 line-through dark:border-neutral-800 dark:text-neutral-600'
              }`}
            >
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: active ? colorFor(algorithm) : 'transparent', outline: active ? 'none' : '1px solid currentColor' }} aria-hidden="true" />
              {name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function Comparison() {
  const { runs } = useBenchmarkHistory();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sizeChoice, setSizeChoice] = useState(null);
  const [statistic, setStatistic] = useState('mean');
  const [hidden, setHidden] = useState([]);
  const [preset, setPreset] = useState('balanced');
  const [weights, setWeights] = useState(WEIGHT_PRESETS.balanced.weights);
  const [memoryMetric, setMemoryMetric] = useState('roundKeys');
  const [comparison, setComparison] = useState({ loading: false, error: null, data: null });

  const run = runs.find((item) => item.runId === searchParams.get('run')) ?? runs[0] ?? null;
  const sizes = messageSizesOf(run);
  const size = sizes.includes(sizeChoice) ? sizeChoice : sizes[sizes.length - 1];

  const atSize = useMemo(() => (run ? run.results.filter((result) => result.messageSize === size) : []), [run, size]);
  const filtered = useMemo(() => atSize.filter((result) => !hidden.includes(result.displayName)), [atSize, hidden]);

  useEffect(() => {
    if (filtered.length === 0) {
      setComparison({ loading: false, error: null, data: null });
      return undefined;
    }
    let cancelled = false;
    setComparison((current) => ({ ...current, loading: true, error: null }));
    const timer = setTimeout(async () => {
      try {
        const data = await compareResults({ results: filtered, statistic, weights });
        if (!cancelled) setComparison({ loading: false, error: null, data });
      } catch (error) {
        if (!cancelled) setComparison({ loading: false, error: getErrorMessage(error), data: null });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filtered, statistic, weights]);

  if (!run) {
    return (
      <div className="space-y-6">
        <PageHeader title="Algorithm Comparison" description="Compare benchmark results side by side and get a recommendation for your requirements." />
        <EmptyState
          icon={ChartColumn}
          title="No benchmark results to compare"
          description="Comparisons use only results measured on your machine. Run a benchmark first; nothing is shown until real measurements exist."
          action={
            <Link to="/benchmark" className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500">
              <FlaskConical className="size-4" aria-hidden="true" /> Run a benchmark
            </Link>
          }
        />
      </div>
    );
  }

  const legendItems = ALGORITHM_ORDER.filter((id) => filtered.some((result) => result.algorithm === id)).map((id) => ({ key: id, label: id, algorithm: id }));
  const statLabel = STATISTIC_OPTIONS.find((option) => option.value === statistic).label.toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Algorithm Comparison"
        description="Side-by-side comparison of results from one benchmark run, so every algorithm was measured under the same conditions."
        actions={<ExportButtons results={filtered} json={{ run: { runId: run.runId, startedAt: run.startedAt, config: run.config, environment: run.environment }, statistic, weights, results: filtered, comparison: comparison.data }} prefix="comparison" />}
      />

      {/* Filters: one row above everything they scope. */}
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end dark:border-neutral-800 dark:bg-neutral-900">
        <SelectField
          id="run"
          className="lg:w-80"
          label="Benchmark run"
          value={run.runId}
          onChange={(event) => {
            setSearchParams({ run: event.target.value });
            setHidden([]);
            setSizeChoice(null);
          }}
          options={runs.map((item) => ({ value: item.runId, label: `${formatDateTime(item.startedAt)} · ${item.config.targets.length} variants` }))}
        />
        <div>
          <p className="mb-1.5 text-sm font-medium">Message size</p>
          <SegmentedControl ariaLabel="Message size" size="sm" value={size} onChange={setSizeChoice} options={sizes.map((value) => ({ value, label: formatBytes(value) }))} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Statistic</p>
          <SegmentedControl ariaLabel="Statistic" size="sm" value={statistic} onChange={setStatistic} options={STATISTIC_OPTIONS} />
        </div>
        <VariantFilter results={atSize} hidden={hidden} onToggle={(name) => setHidden((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]))} />
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Conditions: {formatBytes(size)} messages · {run.config.iterations} measured + {run.config.warmupIterations} warm-up iterations · {run.config.mode} mode · {run.config.datasetName} · {run.environment.nodeVersion} on {run.environment.cpuModel}
      </p>

      {filtered.length === 0 ? (
        <EmptyState title="All algorithms are filtered out" description="Select at least one algorithm in the filter row above." />
      ) : (
        <>
          {legendItems.length > 1 && <ChartLegend items={legendItems} />}
          <div className="grid gap-6 lg:grid-cols-2">
            <ResultBarChart results={filtered} metric="encrypt" statistic={statistic} subtitle={`${statLabel} per message · lower is better`} />
            <ResultBarChart results={filtered} metric="decrypt" statistic={statistic} subtitle={`${statLabel} per message · lower is better`} />
            <ResultBarChart results={filtered} metric="throughput" statistic={statistic} subtitle={`Plaintext bytes / ${statLabel} encryption time · higher is better`} />
            <ResultBarChart results={filtered} metric="ciphertext" subtitle="Bytes including IV and padding, before encoding · lower is better" />
            <ResultBarChart
              results={filtered}
              metric={memoryMetric}
              title={memoryMetric === 'roundKeys' ? 'Round-key storage' : 'Process heap growth (indicative)'}
              subtitle={
                memoryMetric === 'roundKeys'
                  ? 'Exact size of the expanded key held by each implementation · bytes'
                  : 'process.memoryUsage() change during the measured loops · bytes'
              }
              footer={
                memoryMetric === 'roundKeys'
                  ? 'PRESENT additionally uses ~32 KiB of shared lookup tables in this software implementation.'
                  : 'Whole-process figure: includes the runtime, the HTTP server and uncollected garbage. It is not the memory the algorithm needs.'
              }
              actions={
                <SegmentedControl
                  ariaLabel="Memory metric"
                  size="sm"
                  value={memoryMetric}
                  onChange={setMemoryMetric}
                  options={[
                    { value: 'roundKeys', label: 'Round keys' },
                    { value: 'heapDelta', label: 'Heap' },
                  ]}
                />
              }
            />
            <ResultBarChart results={filtered} metric="keySetup" statistic={statistic} subtitle={`Round-key expansion, ${statLabel} · measured separately from encryption`} />
          </div>

          <RecommendationPanel
            state={comparison}
            preset={preset}
            weights={weights}
            onPreset={(value) => {
              setPreset(value);
              if (WEIGHT_PRESETS[value]) setWeights(WEIGHT_PRESETS[value].weights);
            }}
            onWeight={(criterion, value) => {
              setPreset('custom');
              setWeights((current) => ({ ...current, [criterion]: value }));
            }}
          />

          <Card title="Detailed comparison table" description={`Results for ${formatBytes(size)} messages. Throughput column uses the ${statLabel}.`}>
            <ResultsTable results={filtered} statistic={statistic} caption="Algorithm comparison" />
          </Card>
        </>
      )}
    </div>
  );
}
