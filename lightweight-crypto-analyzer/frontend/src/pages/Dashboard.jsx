import { ArrowRight, BookOpen, CircleCheck, CircleX, Cpu, FlaskConical, History, Layers, Lock, ShieldCheck, Timer, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import HistoryList from '../components/benchmark/HistoryList';
import ChartLegend from '../components/charts/ChartLegend';
import ResultBarChart from '../components/charts/ResultBarChart';
import ResultsTable from '../components/tables/ResultsTable';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorMessage from '../components/ui/ErrorMessage';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import MetricCard from '../components/ui/MetricCard';
import { useAlgorithms, useBenchmarkHistory } from '../hooks/useAppContext';
import useChartTheme from '../hooks/useChartTheme';
import { ALGORITHM_ORDER } from '../utils/constants';
import { formatBytes, formatDateTime, formatDuration } from '../utils/format';
import { RESULT_METRICS } from '../utils/metrics';
import { bestOf, messageSizesOf } from '../utils/results';

function QuickLink({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-neutral-800 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-sm font-semibold">
          {title}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </p>
        <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{description}</p>
      </div>
    </Link>
  );
}

function AlgorithmOverview({ algorithms }) {
  const { colorFor } = useChartTheme();
  return (
    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {algorithms.map((algorithm) => (
        <li key={algorithm.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link to={`/algorithms/${algorithm.id}`} className="flex items-center gap-2 font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: colorFor(algorithm.id) }} aria-hidden="true" />
              {algorithm.name}
              <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                {algorithm.designers.split('(')[0].split(',')[0].trim()}{algorithm.designers.includes(',') ? ' et al.' : ''}, {algorithm.year}
              </span>
            </Link>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
              {algorithm.family} · {algorithm.variants.map((variant) => variant.name.replace(`${algorithm.name}-`, '')).join(', ')}
            </p>
          </div>
          {algorithm.implementationStatus === 'verified' ? (
            <Badge tone="success" icon={CircleCheck}>
              {algorithm.selfTest.vectorsPassed}/{algorithm.selfTest.vectorsTotal} test vectors passed
            </Badge>
          ) : (
            <Badge tone="danger" icon={CircleX}>
              Self-test: {algorithm.selfTest.vectorsPassed}/{algorithm.selfTest.vectorsTotal}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const { algorithms, loading, error, reload } = useAlgorithms();
  const { runs, latestRun } = useBenchmarkHistory();
  const { colorFor } = useChartTheme();

  const sorted = [...algorithms].sort((a, b) => ALGORITHM_ORDER.indexOf(a.id) - ALGORITHM_ORDER.indexOf(b.id));
  const variantCount = algorithms.reduce((sum, algorithm) => sum + algorithm.variants.length, 0);
  const verifiedVariants = algorithms.reduce((sum, algorithm) => sum + algorithm.variants.filter((variant) => variant.verified).length, 0);

  // The dashboard summarises the largest message size of the latest run (most stable timings).
  const sizes = messageSizesOf(latestRun);
  const size = sizes[sizes.length - 1];
  const latest = latestRun ? latestRun.results.filter((result) => result.messageSize === size) : [];
  const fastestEncrypt = bestOf(latest, (result) => RESULT_METRICS.encrypt.get(result, 'mean'));
  const fastestDecrypt = bestOf(latest, (result) => RESULT_METRICS.decrypt.get(result, 'mean'));
  const swatchFor = (best) => (best?.names.length === 1 ? colorFor(latest.find((result) => result.displayName === best.names[0])?.algorithm) : undefined);
  const legendItems = ALGORITHM_ORDER.filter((id) => latest.some((result) => result.algorithm === id)).map((id) => ({ key: id, label: id, algorithm: id }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-6 p-6 lg:grid-cols-5 lg:p-8">
          <div className="space-y-4 lg:col-span-3">
            <Badge tone="info" icon={ShieldCheck}>Academic mini project</Badge>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Performance and Security Analysis of Lightweight Cryptographic Algorithms for IoT Devices</h1>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              Sensors, RFID tags and smart cards have too little memory, energy and processing power for conventional cryptography. <span className="font-medium">Lightweight cryptography</span> trades
              some generality for small code, few gates and low energy. This application implements four lightweight block ciphers — PRESENT, SIMON, SPECK and XTEA — verifies them against
              published test vectors, and measures their software performance on your machine.
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Reference: Thakor, Razzaque &amp; Khandaker, “Lightweight Cryptography Algorithms for Resource-Constrained IoT Devices: A Review, Comparison and Research Opportunities,” <span className="italic">IEEE Access</span>, vol. 9, pp. 28177–28193, 2021.
            </p>
          </div>
          <div className="grid gap-3 lg:col-span-2">
            <QuickLink to="/encrypt" icon={Lock} title="Encrypt a message" description="Real encryption and decryption with any implemented cipher." />
            <QuickLink to="/benchmark" icon={FlaskConical} title="Run a benchmark" description="Measure time, throughput, ciphertext size and memory." />
            <QuickLink to="/iot" icon={Cpu} title="Simulate IoT sensor traffic" description="Encrypt and verify simulated sensor readings." />
          </div>
        </div>
      </section>

      {loading && <LoadingIndicator label="Loading algorithms…" />}
      {error && <ErrorMessage title="Backend not reachable" message={error} onRetry={reload} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Implemented algorithms" value={loading || error ? '–' : algorithms.length} icon={Layers} hint={loading || error ? 'Waiting for the API' : `${verifiedVariants} of ${variantCount} variants verified by known-answer tests`} />
        <MetricCard label="Benchmark runs" value={runs.length} icon={History} hint={latestRun ? `Latest: ${formatDateTime(latestRun.startedAt)}` : 'Stored in this browser'} />
        <MetricCard
          label="Fastest measured encryption"
          value={fastestEncrypt ? fastestEncrypt.names.join(', ') : 'No data yet'}
          swatch={swatchFor(fastestEncrypt)}
          icon={Timer}
          hint={fastestEncrypt ? `${formatDuration(fastestEncrypt.value)} mean for ${formatBytes(size)} (latest run)` : 'Run a benchmark to measure'}
        />
        <MetricCard
          label="Fastest measured decryption"
          value={fastestDecrypt ? fastestDecrypt.names.join(', ') : 'No data yet'}
          swatch={swatchFor(fastestDecrypt)}
          icon={Zap}
          hint={fastestDecrypt ? `${formatDuration(fastestDecrypt.value)} mean for ${formatBytes(size)} (latest run)` : 'Run a benchmark to measure'}
        />
      </div>

      {latestRun ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Latest benchmark results</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {formatBytes(size)} messages · {latestRun.config.iterations} iterations · {latestRun.config.mode} · measured {formatDateTime(latestRun.startedAt)}
              </p>
            </div>
            {legendItems.length > 1 && <ChartLegend items={legendItems} />}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ResultBarChart results={latest} metric="encrypt" title="Encryption time comparison" subtitle="Mean per message · lower is better" />
            <ResultBarChart results={latest} metric="throughput" title="Throughput comparison" subtitle="Plaintext bytes / mean encryption time · higher is better" />
          </div>
          <Card
            title="Algorithm performance summary"
            description="Measured by this application. Hardware figures (gate count, power) are not measured here; see Algorithm Information for literature values."
            actions={
              <Link to="/comparison" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                Full comparison →
              </Link>
            }
          >
            <ResultsTable results={latest} compact caption="Latest benchmark summary" />
          </Card>
        </>
      ) : (
        <EmptyState
          icon={FlaskConical}
          title="No benchmark results yet"
          description="This dashboard only shows measurements produced on your machine; it never displays sample or estimated numbers. Run a benchmark to populate the charts."
          action={
            <Link to="/benchmark" className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500">
              <FlaskConical className="size-4" aria-hidden="true" /> Run your first benchmark
            </Link>
          }
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Implemented algorithms" icon={BookOpen} description="Status comes from known-answer tests the server runs at start-up.">
          {loading ? <LoadingIndicator /> : error ? <p className="text-sm text-neutral-500">Unavailable while the API is offline.</p> : <AlgorithmOverview algorithms={sorted} />}
        </Card>
        <Card title="Recent benchmark history" icon={History} description="The five most recent runs saved in this browser.">
          {runs.length === 0 ? <p className="text-sm text-neutral-500 dark:text-neutral-400">No runs yet.</p> : <HistoryList runs={runs} limit={5} />}
        </Card>
      </div>
    </div>
  );
}
