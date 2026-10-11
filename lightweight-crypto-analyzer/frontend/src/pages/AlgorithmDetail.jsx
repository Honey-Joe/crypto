import { ArrowLeft, BookOpen, CircleCheck, CircleX, FlaskConical, Gauge, Library, ShieldAlert, Wrench } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Callout from '../components/ui/Callout';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorMessage from '../components/ui/ErrorMessage';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import { useBenchmarkHistory } from '../hooks/useAppContext';
import useChartTheme from '../hooks/useChartTheme';
import { getAlgorithm } from '../services/algorithmService';
import { getErrorMessage } from '../utils/errors';
import { formatBytes, formatDateTime, formatDuration, formatThroughput } from '../utils/format';
import { isPassed, sortResults } from '../utils/results';

const th = 'py-2 pr-4 text-left text-xs font-semibold whitespace-nowrap text-neutral-500 dark:text-neutral-400';
const td = 'py-2 pr-4 align-top whitespace-nowrap tabular';

function KeyValueTable({ rows }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th scope="row" className="py-1.5 pr-4 text-left font-normal text-neutral-600 dark:text-neutral-400">{label}</th>
            <td className="py-1.5 text-right font-medium tabular">{value ?? '–'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LiteraturePanel({ literature }) {
  const { hardware, software } = literature.reviewTable3;
  return (
    <Card title="Reported in the literature" icon={Library} description="From the reference review (not measured by this application).">
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">Hardware (ASIC)</p>
            {hardware ? (
              <KeyValueTable
                rows={[
                  ['Variant (key / block)', `${hardware.keyBits} / ${hardware.blockBits} bits`],
                  ['Technology', `${hardware.technologyUm} µm`],
                  ['Area', `${hardware.areaGE.toLocaleString()} GE`],
                  ['Power', `${hardware.powerUW} µW`],
                  ['Energy (as printed)', `${hardware.energyPerBit} µJ/bit`],
                  ['Throughput @100 kHz', `${hardware.throughputKbps100kHz} Kbps`],
                  ['Efficiency', `${hardware.efficiencyKbpsPerKGE} Kbps/KGE`],
                ]}
              />
            ) : (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{literature.hardwareNote}</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Software (microcontroller)</p>
            <KeyValueTable
              rows={[
                ['Variant (key / block)', `${software.keyBits} / ${software.blockBits} bits`],
                ['ROM / RAM', `${software.romBytes} B / ${software.ramBytes} B`],
                ['Latency', `${software.latencyCyclesPerBlock.toLocaleString()} cycles/block`],
                ['Energy (as printed)', `${software.energyPerBit} µJ/bit`],
                ['Throughput @4 MHz', `${software.throughputKbps4MHz} Kbps`],
                ['Efficiency', `${software.efficiencyKbpsPerKB} Kbps/KB`],
              ]}
            />
          </div>
        </div>
        {literature.variantNote && <p className="text-xs text-amber-700 dark:text-amber-400">{literature.variantNote}</p>}
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
          {literature.observations.map((observation) => (
            <li key={observation}>{observation}</li>
          ))}
        </ul>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Source: {literature.tableSource}. {literature.tableNote}
        </p>
      </div>
    </Card>
  );
}

function MeasuredPanel({ algorithmId }) {
  const { runs } = useBenchmarkHistory();
  const run = runs.find((item) => item.results.some((result) => result.algorithm === algorithmId && isPassed(result)));
  const results = run ? sortResults(run.results.filter((result) => result.algorithm === algorithmId)) : [];

  return (
    <Card title="Measured by this application" icon={Gauge} description="Software timings of this project's JavaScript implementation on your machine.">
      {!run ? (
        <EmptyState
          icon={FlaskConical}
          title="Not measured yet"
          description="No saved benchmark includes this algorithm."
          action={
            <Link to="/benchmark" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Run a benchmark →
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th scope="col" className={th}>Variant</th>
                  <th scope="col" className={th}>Message</th>
                  <th scope="col" className={th}>Encrypt (mean)</th>
                  <th scope="col" className={th}>Decrypt (mean)</th>
                  <th scope="col" className={th}>Throughput</th>
                  <th scope="col" className={th}>Round keys</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {results.map((result) => (
                  <tr key={result.id}>
                    <td className={td}>{result.displayName}</td>
                    <td className={td}>{formatBytes(result.messageSize)}</td>
                    <td className={td}>{isPassed(result) ? formatDuration(result.encrypt.meanMs) : 'failed'}</td>
                    <td className={td}>{isPassed(result) ? formatDuration(result.decrypt.meanMs) : 'failed'}</td>
                    <td className={td}>{isPassed(result) ? formatThroughput(result.throughput.encryptBytesPerSec) : '–'}</td>
                    <td className={td}>{formatBytes(result.memory?.roundKeyBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            From the run of {formatDateTime(run.startedAt)} ({run.config.mode}, {run.config.iterations} iterations, {run.environment.nodeVersion} on {run.environment.cpuModel}). These numbers are not
            comparable with the cycle counts above, which come from different hardware and languages.
          </p>
        </div>
      )}
    </Card>
  );
}

export default function AlgorithmDetail() {
  const { id } = useParams();
  const { colorFor } = useChartTheme();
  const [state, setState] = useState({ loading: true, error: null, algorithm: null });

  const load = useCallback(async () => {
    setState({ loading: true, error: null, algorithm: null });
    try {
      setState({ loading: false, error: null, algorithm: await getAlgorithm(id) });
    } catch (error) {
      setState({ loading: false, error: getErrorMessage(error), algorithm: null });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const back = (
    <Link to="/algorithms" className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
      <ArrowLeft className="size-4" aria-hidden="true" /> All algorithms
    </Link>
  );

  if (state.loading) return <LoadingIndicator label="Loading algorithm details…" />;
  if (state.error) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorMessage title="Could not load this algorithm" message={state.error} onRetry={load} />
      </div>
    );
  }

  const algorithm = state.algorithm;
  const passedVectors = algorithm.testVectors.filter((vector) => vector.passed).length;

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <span className="size-3.5 rounded-sm" style={{ backgroundColor: colorFor(algorithm.id) }} aria-hidden="true" />
            {algorithm.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {algorithm.fullName} · {algorithm.designers} · {algorithm.year}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={algorithm.implementationStatus === 'verified' ? 'success' : 'danger'} icon={algorithm.implementationStatus === 'verified' ? CircleCheck : CircleX}>
            Implementation {algorithm.implementationStatus === 'verified' ? 'verified' : algorithm.implementationStatus.replace('-', ' ')}
          </Badge>
          <Badge tone={passedVectors === algorithm.testVectors.length ? 'success' : 'danger'}>
            {passedVectors}/{algorithm.testVectors.length} known-answer tests
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Operating principle" icon={BookOpen}>
          <div className="space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{algorithm.summary}</p>
            {algorithm.principle.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Family: {algorithm.family} · Review category: {algorithm.reviewCategory} · {algorithm.standardization}
            </p>
          </div>
        </Card>
        <Card title="Intended lightweight use cases">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            {algorithm.useCases.map((useCase) => (
              <li key={useCase}>{useCase}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Supported variants in this implementation" description={`Byte order: ${algorithm.byteOrder}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {['Variant', 'Block size', 'Key size', 'Word size', 'Rounds', 'Round-key storage', 'Status'].map((heading) => (
                  <th key={heading} scope="col" className={th}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {algorithm.variants.map((variant) => (
                <tr key={variant.id}>
                  <td className={`${td} font-medium`}>
                    {variant.name} {variant.isDefault && <Badge tone="info">default</Badge>}
                  </td>
                  <td className={td}>{variant.blockBits} bits</td>
                  <td className={td}>{variant.keyBits} bits</td>
                  <td className={td}>{variant.wordBits ? `${variant.wordBits} bits` : '–'}</td>
                  <td className={td}>{variant.roundsNote ?? variant.rounds}</td>
                  <td className={td}>{formatBytes(variant.roundKeyBytes)}</td>
                  <td className={td}>
                    {variant.verified ? (
                      <Badge tone="success" icon={CircleCheck}>{variant.selfTest.vectorsPassed}/{variant.selfTest.vectorsTotal} KAT · {variant.selfTest.roundTripsPassed} round trips</Badge>
                    ) : (
                      <Badge tone="danger" icon={CircleX}>Not verified</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <LiteraturePanel literature={algorithm.literature} />
        <MeasuredPanel algorithmId={algorithm.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Implementation notes" icon={Wrench}>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            {algorithm.implementationNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Card>
        <Callout tone="warning" title="Security limitations" icon={ShieldAlert}>
          <ul className="list-disc space-y-1.5 pl-4">
            {algorithm.securityNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            This is a summary of published research, not a current security assessment. Being lightweight or fast does not make a cipher suitable for new production systems; for new designs prefer
            standardised authenticated encryption such as NIST's Ascon (SP 800-232) or AES-GCM/CCM.
          </p>
        </Callout>
      </div>

      <Card title="Known-answer test results" description="Run by the server at start-up. Encryption and decryption must both reproduce the published values.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {['Variant', 'Key', 'Plaintext', 'Expected ciphertext', 'Computed', 'Result', 'Source'].map((heading) => (
                  <th key={heading} scope="col" className={th}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono text-xs dark:divide-neutral-800">
              {algorithm.testVectors.map((vector, index) => (
                <tr key={`${vector.variant}-${index}`}>
                  <td className={`${td} font-sans`}>{vector.variant}</td>
                  <td className={td}>{vector.key}</td>
                  <td className={td}>{vector.plaintext}</td>
                  <td className={td}>{vector.expectedCiphertext}</td>
                  <td className={td}>{vector.actualCiphertext ?? vector.error}</td>
                  <td className={`${td} font-sans`}>
                    {vector.passed ? <Badge tone="success" icon={CircleCheck}>Pass</Badge> : <Badge tone="danger" icon={CircleX}>Fail</Badge>}
                  </td>
                  <td className="py-2 pr-4 align-top font-sans text-neutral-600 dark:text-neutral-400">{vector.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="References">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
          {algorithm.references.map((reference) => (
            <li key={reference.id}>
              {reference.authors}, “{reference.title},” <span className="italic">{reference.venue}</span>, {reference.year}.{' '}
              {reference.url && (
                <a href={reference.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
                  {reference.doi ? `doi:${reference.doi}` : reference.url}
                </a>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
