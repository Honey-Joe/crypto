import { BookOpen, ExternalLink, GraduationCap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Callout from '../components/ui/Callout';
import Card from '../components/ui/Card';
import ErrorMessage from '../components/ui/ErrorMessage';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import PageHeader from '../components/ui/PageHeader';
import { getReferences } from '../services/systemService';
import { getErrorMessage } from '../utils/errors';

const OBJECTIVES = [
  'Study lightweight cryptography for resource-constrained IoT devices.',
  'Implement PRESENT, SIMON, SPECK and XTEA and verify them against published test vectors.',
  'Encrypt and decrypt user-provided messages with each algorithm.',
  'Measure encryption and decryption time, throughput, ciphertext size and memory statistics.',
  'Compare algorithms using identical inputs and identical test conditions.',
  'Present results through charts, tables and summary cards, and export them.',
  'Simulate encryption of IoT sensor data.',
  'Explain the trade-offs between security, performance and resource consumption.',
];

const MODULES = [
  ['Dashboard', 'Summary of implemented algorithms, latest measured results, charts and history.'],
  ['Encrypt / Decrypt', 'Interactive encryption and decryption with key generation, hex/Base64 output and verification.'],
  ['Performance Benchmark', 'Configurable multi-algorithm, multi-size benchmark with warm-up, repeated timing, round-trip checks and CSV/JSON export.'],
  ['Algorithm Comparison', 'Charts, a detailed table and a weighted, performance-only recommendation computed by the API.'],
  ['IoT Simulation', 'Simulated sensor readings encrypted by a virtual device and verified by a virtual gateway.'],
  ['Algorithm Information', 'Design, parameters, literature figures, measured results, limitations and live test-vector status.'],
  ['About Project', 'Project documentation and references (this page).'],
];

const STACK = [
  ['Frontend', 'React 19, Vite, Tailwind CSS 4, React Router, Axios, Recharts, Lucide icons'],
  ['Backend', 'Node.js, Express 5 (ES modules), node:crypto for randomness, node:perf_hooks for timing'],
  ['Cryptography', 'Own JavaScript implementations of PRESENT, SIMON, SPECK and XTEA; CBC, CTR and ECB modes; PKCS#7 padding'],
  ['Testing', 'Node.js built-in test runner (node:test) with known-answer, unit and HTTP API tests'],
  ['Storage', 'No database; benchmark history is kept in the browser (localStorage)'],
];

const LIMITATIONS = [
  'All measurements are software timings of JavaScript implementations on a general-purpose computer. They do not represent microcontrollers, and gate count, power and energy cannot be measured.',
  'Timings depend on the CPU, operating system, Node.js/V8 version, JIT optimisation, background load and the quality of each implementation. Results from different machines or runs are not directly comparable.',
  'Process memory figures cover the whole Node.js process, not the algorithm alone. Round-key sizes are exact, but they exclude code size and stack usage.',
  'The modes provided (CBC, CTR, ECB) offer confidentiality only; there is no message authentication. ECB is included purely to demonstrate its weakness.',
  'Only the 32- and 64-bit block variants of SIMON and SPECK are implemented.',
  'The PRESENT implementation uses lookup tables and the key schedules use ordinary arithmetic; the code is not hardened against timing or other side-channel attacks.',
  'The API returns distinct padding errors, which would act as a padding oracle if exposed to attackers. This is acceptable for a local teaching tool but not for a real service.',
  'Benchmarks run on the server\'s single JavaScript thread, so the API is busy while a benchmark executes.',
];

const FUTURE = [
  'Add authenticated encryption: NIST Ascon-AEAD128 (SP 800-232) and a MAC for the existing ciphers.',
  'Run the same implementations on real microcontrollers (e.g. ESP32, Arduino, ARM Cortex-M) and compare cycles per byte and energy.',
  'Add the 48-, 96- and 128-bit block variants of SIMON and SPECK, plus other lightweight ciphers (e.g. GIFT, LEA, TWINE).',
  'Bit-sliced and constant-time implementations, and side-channel analysis.',
  'Optional MongoDB storage so benchmark history can be shared between users and machines.',
  'Run benchmarks in worker threads so the API stays responsive.',
];

function List({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Section({ title, children }) {
  return (
    <Card title={title}>
      <div className="space-y-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</div>
    </Card>
  );
}

export default function About() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const load = useCallback(async () => {
    setState({ loading: true, error: null, data: null });
    try {
      setState({ loading: false, error: null, data: await getReferences() });
    } catch (error) {
      setState({ loading: false, error: getErrorMessage(error), data: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="About the Project" description="Performance and Security Analysis of Lightweight Cryptographic Algorithms for IoT Devices." />

      <Section title="Abstract">
        <p>
          Internet of Things devices such as sensor nodes, RFID tags and smart cards must protect the data they collect, yet they have very little memory, processing power, silicon area and
          energy. Lightweight block ciphers are designed for these constraints. This project implements four of them — PRESENT, SIMON, SPECK and XTEA — as a Node.js/Express service, verifies each
          implementation against published known-answer test vectors, and provides a React dashboard to encrypt and decrypt data, benchmark the algorithms under identical conditions, compare them
          visually, and simulate encrypted IoT sensor traffic. The project separates software measurements it makes itself from hardware figures reported in the literature, and it explains the
          security limitations that performance numbers cannot reveal.
        </p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Problem statement">
          <p>
            Conventional algorithms such as AES are often too expensive for the smallest IoT devices in gate count, code size or energy. Many lightweight alternatives exist, but their published
            performance figures come from different platforms, technologies and variants, which makes it hard for students and developers to see the trade-offs for themselves. There is a need for a
            tool that runs real implementations side by side under identical conditions, while being honest about what software measurements can and cannot show.
          </p>
        </Section>
        <Section title="Objectives">
          <List items={OBJECTIVES} />
        </Section>
        <Section title="Existing system">
          <p>
            Comparisons of lightweight ciphers are usually found in survey tables compiled from many separate studies. The numbers are measured on different hardware (ASIC technologies,
            microcontrollers), with different variants and tools, and are rarely reproducible by the reader. Ciphers are often demonstrated with toy code or substituted by AES, and simple encodings
            such as Base64 are sometimes mistaken for encryption.
          </p>
        </Section>
        <Section title="Proposed system">
          <p>
            A full-stack application in which the backend implements each cipher from its specification, refuses to offer any variant that fails its known-answer tests, and measures performance
            with a documented methodology (shared inputs, separate key-setup timing, warm-up, per-iteration high-resolution timing, round-trip verification). The frontend visualises the measured
            results, recommends algorithms for user-chosen performance criteria, and clearly separates measured data from literature values and from security assessment.
          </p>
        </Section>
      </div>

      <Section title="Methodology">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Implement each cipher from its specification with a documented byte order, and check it against published test vectors (22 vectors across 8 variants) at start-up and in the test suite.</li>
          <li>Wrap the block ciphers in standard modes of operation (CBC with a random IV and PKCS#7 padding by default; CTR; ECB for demonstration) so messages of any length can be processed.</li>
          <li>Expose encryption, decryption, benchmarking and comparison through a validated REST API with consistent JSON errors.</li>
          <li>Benchmark with identical plaintext per message size, separate key-setup timing, unmeasured warm-up, per-iteration performance.now() timing, and verification of every iteration.</li>
          <li>Report mean, median, minimum, maximum and standard deviation; compute throughput as plaintext bytes divided by mean time.</li>
          <li>Compare only results measured under the same conditions, warn when conditions differ, and keep security discussion separate from performance rankings.</li>
        </ol>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Technology stack">
          <dl className="space-y-2">
            {STACK.map(([label, value]) => (
              <div key={label}>
                <dt className="font-semibold text-neutral-900 dark:text-neutral-100">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section title="Modules">
          <dl className="space-y-2">
            {MODULES.map(([label, value]) => (
              <div key={label}>
                <dt className="font-semibold text-neutral-900 dark:text-neutral-100">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section title="Limitations">
          <List items={LIMITATIONS} />
        </Section>
        <Section title="Future enhancements">
          <List items={FUTURE} />
        </Section>
      </div>

      <Card title="Reference paper" icon={GraduationCap}>
        {state.loading && <LoadingIndicator label="Loading references…" />}
        {state.error && <ErrorMessage title="Could not load references from the API" message={state.error} onRetry={load} />}
        {state.data && (
          <div className="space-y-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{state.data.paper.citation}</p>
            <div className="space-y-2">
              <p className="font-semibold">Summary (in our own words)</p>
              <List items={state.data.paper.summary} />
            </div>
            <Callout tone="info" title="The paper's conclusions vs. this project's results">
              <p>{state.data.paper.distinction}</p>
            </Callout>
          </div>
        )}
      </Card>

      {state.data && (
        <Card title="References" icon={BookOpen}>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            {state.data.references.map((reference) => (
              <li key={reference.id}>
                {reference.authors}, “{reference.title},” <span className="italic">{reference.venue}</span>, {reference.year}.
                {reference.url && (
                  <>
                    {' '}
                    <a href={reference.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400">
                      {reference.doi ? `doi:${reference.doi}` : 'link'}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </>
                )}
                {reference.note && <span className="block text-xs text-neutral-500 dark:text-neutral-400">{reference.note}</span>}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
