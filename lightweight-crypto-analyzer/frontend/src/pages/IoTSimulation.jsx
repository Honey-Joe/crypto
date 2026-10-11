import { ArrowDown, ArrowRight, CircleCheck, CircleX, Cpu, Droplets, Pause, Play, Radio, RefreshCw, Router, Send, Sprout, Thermometer, Wind } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AlgorithmPicker from '../components/crypto/AlgorithmPicker';
import KeyField from '../components/crypto/KeyField';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Callout from '../components/ui/Callout';
import Card from '../components/ui/Card';
import ErrorMessage from '../components/ui/ErrorMessage';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import { useAlgorithms } from '../hooks/useAppContext';
import useCipherSelection from '../hooks/useCipherSelection';
import { decryptSensorMessage, encryptSensorMessage, getSensorReading } from '../services/iotService';
import { getErrorMessage } from '../utils/errors';
import { formatDuration, formatThroughput } from '../utils/format';
import { parseSensorMessage, SENSOR_KEYS } from '../utils/iotMessage';
import { validateHexKey } from '../utils/validation';

const DEVICE_ID = 'SENSOR-001';
const AUTO_INTERVAL_MS = 3000;
const LOG_LIMIT = 10;

const SENSOR_DISPLAY = {
  temperature: { icon: Thermometer, label: 'Temperature', unit: '°C' },
  humidity: { icon: Droplets, label: 'Humidity', unit: '%RH' },
  soilMoisture: { icon: Sprout, label: 'Soil moisture', unit: '%' },
  airQuality: { icon: Wind, label: 'Air quality', unit: 'AQI' },
};

function SensorTile({ field, value }) {
  const { icon: Icon, label, unit } = SENSOR_DISPLAY[field];
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">
        {value ?? '–'} <span className="text-sm font-normal text-neutral-500">{unit}</span>
      </p>
    </div>
  );
}

const STEP_STATES = {
  idle: 'border-neutral-200 dark:border-neutral-800',
  active: 'border-indigo-400 ring-2 ring-indigo-100 dark:border-indigo-500 dark:ring-indigo-500/20',
  done: 'border-emerald-300 dark:border-emerald-800',
  error: 'border-red-300 dark:border-red-800',
};

function PipelineStep({ index, title, icon: Icon, state, children }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2 rounded-xl border p-4 transition-colors ${STEP_STATES[state]}`}>
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold dark:bg-neutral-800">{index}</span>
        <Icon className="size-4 text-neutral-500" aria-hidden="true" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="min-w-0 text-sm text-neutral-700 dark:text-neutral-300">{children}</div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-center text-neutral-400" aria-hidden="true">
      <ArrowDown className="size-4 lg:hidden" />
      <ArrowRight className="hidden size-4 lg:block" />
    </div>
  );
}

function Mono({ children }) {
  return <p className="max-h-28 overflow-y-auto rounded-md bg-neutral-50 p-2 font-mono text-xs break-all dark:bg-neutral-950/60">{children}</p>;
}

export default function IoTSimulation() {
  const { loading: algorithmsLoading, error: algorithmsError, reload } = useAlgorithms();
  const cipher = useCipherSelection('SPECK');
  const [format, setFormat] = useState('json');
  const [reading, setReading] = useState(null);
  const [readingError, setReadingError] = useState(null);
  const [transmission, setTransmission] = useState({ stage: 'idle', message: null, encrypt: null, decrypt: null, error: null, format: 'json' });
  const [log, setLog] = useState([]);
  const [auto, setAuto] = useState(false);
  const busy = useRef(false);

  const keyError = validateHexKey(cipher.key, cipher.expectedHexLength);

  const fetchReading = useCallback(async () => {
    try {
      const data = await getSensorReading(DEVICE_ID);
      setReading(data);
      setReadingError(null);
      return data;
    } catch (error) {
      setReadingError(getErrorMessage(error));
      return null;
    }
  }, []);

  useEffect(() => {
    fetchReading();
  }, [fetchReading]);

  const transmit = useCallback(
    async (data) => {
      if (!data || keyError || !cipher.variantId || busy.current) return;
      busy.current = true;
      const message = data.messages[format];
      const params = { algorithm: cipher.algorithm, variant: cipher.variantId, mode: cipher.mode, key: cipher.key.replace(/\s+/g, '') };
      setTransmission({ stage: 'encrypting', message, encrypt: null, decrypt: null, error: null, format, reading: data.reading });
      try {
        const encrypted = await encryptSensorMessage({ ...params, message });
        setTransmission((current) => ({ ...current, stage: 'decrypting', encrypt: encrypted }));
        const decrypted = await decryptSensorMessage({ ...params, ciphertext: encrypted.ciphertext, expectedMessage: message });
        setTransmission((current) => ({ ...current, stage: 'done', decrypt: decrypted }));
        setLog((current) =>
          [
            {
              id: `${data.reading.sequence}-${Date.now()}`,
              sequence: data.reading.sequence,
              time: new Date().toLocaleTimeString(),
              cipher: encrypted.displayName,
              mode: encrypted.mode,
              payloadBytes: encrypted.sizes.plaintextBytes,
              ciphertextBytes: encrypted.sizes.rawCiphertextBytes,
              encryptMs: encrypted.timing.encryptionMs,
              decryptMs: decrypted.timing.decryptionMs,
              verified: decrypted.verification?.matches === true,
            },
            ...current,
          ].slice(0, LOG_LIMIT),
        );
      } catch (error) {
        setTransmission((current) => ({ ...current, stage: 'error', error: getErrorMessage(error) }));
        setAuto(false);
      } finally {
        busy.current = false;
      }
    },
    [cipher.algorithm, cipher.variantId, cipher.mode, cipher.key, keyError, format],
  );

  useEffect(() => {
    if (!auto) return undefined;
    const timer = setInterval(async () => {
      if (busy.current) return;
      const data = await fetchReading();
      await transmit(data);
    }, AUTO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [auto, fetchReading, transmit]);

  if (algorithmsLoading) return <LoadingIndicator label="Loading algorithms from the API…" />;
  if (algorithmsError) return <ErrorMessage title="Could not load algorithms" message={algorithmsError} onRetry={reload} />;

  const { stage, encrypt, decrypt } = transmission;
  const recovered = decrypt ? parseSensorMessage(decrypt.plaintext, transmission.format) : null;
  const stepState = (step) => {
    const order = ['payload', 'encrypting', 'channel', 'decrypting'];
    if (stage === 'idle') return 'idle';
    if (stage === 'error') return 'error';
    if (stage === 'done') return 'done';
    const current = stage === 'encrypting' ? 1 : 3;
    const index = order.indexOf(step);
    if (index < current) return 'done';
    return index === current ? 'active' : 'idle';
  };
  const overhead = encrypt ? encrypt.sizes.rawCiphertextBytes - encrypt.sizes.plaintextBytes : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="IoT Sensor Simulation"
        description="A simulated field sensor encrypts each reading before sending it; a simulated gateway decrypts and verifies it. Choose the cipher and message format to see the cost of protecting small IoT messages."
      />

      <Callout tone="info" title="Software simulation" icon={Radio}>
        <p>No physical IoT devices are connected. Readings are generated by the backend (a bounded random walk), and both the “device” and the “gateway” run on the same server.</p>
      </Callout>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card
          className="xl:col-span-2"
          title={`Device ${DEVICE_ID}`}
          icon={Cpu}
          description={reading ? `Reading #${reading.reading.sequence} · ${new Date(reading.reading.timestamp).toLocaleTimeString()}` : 'Waiting for the first reading'}
          actions={auto ? <Badge tone="success" icon={Radio}>Auto-transmitting</Badge> : null}
        >
          {readingError && <ErrorMessage title="Could not get a reading" message={readingError} onRetry={fetchReading} className="mb-4" />}
          <div className="grid grid-cols-2 gap-3">
            {SENSOR_KEYS.map((field) => (
              <SensorTile key={field} field={field} value={reading?.reading[field]} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" icon={RefreshCw} onClick={fetchReading} disabled={auto}>
              New reading
            </Button>
            <Button icon={Send} onClick={() => transmit(reading)} disabled={!reading || Boolean(keyError) || auto} loading={stage === 'encrypting' || stage === 'decrypting'}>
              Encrypt &amp; send
            </Button>
            <Button variant={auto ? 'danger' : 'secondary'} icon={auto ? Pause : Play} onClick={() => setAuto((current) => !current)} disabled={!reading || Boolean(keyError)}>
              {auto ? 'Stop auto-transmit' : `Auto every ${AUTO_INTERVAL_MS / 1000} s`}
            </Button>
          </div>
        </Card>

        <Card className="xl:col-span-3" title="Security settings" description="Shared by the device and the gateway (pre-shared symmetric key).">
          <div className="space-y-5">
            <AlgorithmPicker idPrefix="iot" algorithmId={cipher.algorithm} variantId={cipher.variantId ?? ''} onChange={cipher.setSelection} mode={cipher.mode} onModeChange={cipher.setMode} disabled={auto} />
            <KeyField id="iot-key" value={cipher.key} onChange={cipher.setKey} expectedHexLength={cipher.expectedHexLength} onGenerate={cipher.regenerateKey} generating={cipher.generating} showValidation />
            <div>
              <p className="mb-1.5 text-sm font-medium">Message format</p>
              <SegmentedControl
                ariaLabel="Message format"
                value={format}
                onChange={setFormat}
                options={[
                  { value: 'json', label: `JSON${reading ? ` (${reading.messageBytes.json} B)` : ''}` },
                  { value: 'compact', label: `Compact${reading ? ` (${reading.messageBytes.compact} B)` : ''}` },
                ]}
              />
              <p className="mt-1.5 text-xs wrap-anywhere text-neutral-500 dark:text-neutral-400">{reading?.formats[format]}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Transmission pipeline" description="Each stage shows exactly what is produced. Timings are single operations measured on the server.">
        {stage === 'idle' ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Press “Encrypt &amp; send” to transmit the current reading.</p>
        ) : (
          <div className="flex flex-col gap-3 lg:flex-row">
            <PipelineStep index={1} title="Sensor payload" icon={Cpu} state={stepState('payload')}>
              <Mono>{transmission.message}</Mono>
              <p className="mt-1 text-xs text-neutral-500">{new TextEncoder().encode(transmission.message ?? '').length} bytes plaintext</p>
            </PipelineStep>
            <Connector />
            <PipelineStep index={2} title="Device encrypts" icon={Send} state={stepState('encrypting')}>
              {encrypt ? (
                <ul className="space-y-0.5 text-xs">
                  <li>{encrypt.displayName} · {encrypt.mode}</li>
                  <li>Key setup {formatDuration(encrypt.timing.keySetupMs)}</li>
                  <li>Encryption {formatDuration(encrypt.timing.encryptionMs)}</li>
                </ul>
              ) : (
                <p className="text-xs text-neutral-500">Encrypting…</p>
              )}
            </PipelineStep>
            <Connector />
            <PipelineStep index={3} title="Ciphertext on the channel" icon={Radio} state={stepState('channel')}>
              {encrypt ? (
                <>
                  <Mono>{encrypt.ciphertext}</Mono>
                  <p className="mt-1 text-xs text-neutral-500">
                    {encrypt.sizes.rawCiphertextBytes} raw bytes (+{overhead} B IV/padding) · {encrypt.sizes.encodedCiphertextChars} Base64 chars
                  </p>
                </>
              ) : (
                <p className="text-xs text-neutral-500">Waiting…</p>
              )}
            </PipelineStep>
            <Connector />
            <PipelineStep index={4} title="Gateway decrypts & verifies" icon={Router} state={stepState('decrypting')}>
              {decrypt ? (
                <div className="space-y-1">
                  {decrypt.verification?.matches ? <Badge tone="success" icon={CircleCheck}>Data verified</Badge> : <Badge tone="danger" icon={CircleX}>Mismatch</Badge>}
                  <p className="text-xs">Decryption {formatDuration(decrypt.timing.decryptionMs)}</p>
                </div>
              ) : stage === 'error' ? (
                <Badge tone="danger" icon={CircleX}>Failed</Badge>
              ) : (
                <p className="text-xs text-neutral-500">Waiting…</p>
              )}
            </PipelineStep>
          </div>
        )}
        {transmission.error && <ErrorMessage className="mt-4" title="Transmission failed" message={transmission.error} />}
      </Card>

      {encrypt && decrypt && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Encryption time" value={formatDuration(encrypt.timing.encryptionMs)} hint="Single operation (device side)" />
            <MetricCard label="Decryption time" value={formatDuration(decrypt.timing.decryptionMs)} hint="Single operation (gateway side)" />
            <MetricCard label="Encryption throughput" value={formatThroughput(encrypt.timing.throughputBytesPerSec)} hint="Payload bytes / encryption time" />
            <MetricCard
              label="Ciphertext overhead"
              value={`+${overhead} B`}
              hint={`${encrypt.sizes.plaintextBytes} B → ${encrypt.sizes.rawCiphertextBytes} B (${Math.round((overhead / encrypt.sizes.plaintextBytes) * 100)}% larger)`}
            />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Single-message timings of a few microseconds are noisy and include fixed per-call costs; use the Benchmark page for statistically meaningful comparisons.
          </p>

          <Card title="Recovered sensor data" description="Values parsed from the decrypted message, compared with what the device sent.">
            {recovered ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-neutral-500 dark:text-neutral-400">
                      <th scope="col" className="py-2 pr-4 font-semibold">Field</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Sent</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Received</th>
                      <th scope="col" className="py-2 font-semibold">Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {['deviceId', 'sequence', ...SENSOR_KEYS].map((field) => {
                      const sent = transmission.reading?.[field];
                      const received = recovered[field];
                      const match = String(sent) === String(received);
                      return (
                        <tr key={field}>
                          <td className="py-2 pr-4">{SENSOR_DISPLAY[field]?.label ?? (field === 'deviceId' ? 'Device ID' : 'Sequence')}</td>
                          <td className="py-2 pr-4 tabular">{String(sent)}</td>
                          <td className="py-2 pr-4 tabular">{String(received)}</td>
                          <td className="py-2">{match ? <Badge tone="success" icon={CircleCheck}>Yes</Badge> : <Badge tone="danger" icon={CircleX}>No</Badge>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <ErrorMessage title="Recovered message could not be parsed" message="The decrypted bytes are not a valid sensor message." />
            )}
          </Card>
        </>
      )}

      <Card title="Transmission log" description={`The last ${LOG_LIMIT} packets sent in this session.`}>
        {log.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No packets sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500 dark:text-neutral-400">
                  {['Seq', 'Time', 'Cipher', 'Payload', 'Ciphertext', 'Encrypt', 'Decrypt', 'Verified'].map((heading) => (
                    <th key={heading} scope="col" className="py-2 pr-4 font-semibold whitespace-nowrap">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {log.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2 pr-4 tabular">{entry.sequence}</td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular">{entry.time}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{entry.cipher} · {entry.mode}</td>
                    <td className="py-2 pr-4 tabular">{entry.payloadBytes} B</td>
                    <td className="py-2 pr-4 tabular">{entry.ciphertextBytes} B</td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular">{formatDuration(entry.encryptMs)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap tabular">{formatDuration(entry.decryptMs)}</td>
                    <td className="py-2">{entry.verified ? <Badge tone="success" icon={CircleCheck}>Yes</Badge> : <Badge tone="danger" icon={CircleX}>No</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Callout tone="warning" title="What this simulation does not cover">
        <p>
          Confidentiality only: the modes used here do not authenticate messages, so a tampered or replayed packet would not be detected. Real deployments add a MAC or use an AEAD cipher
          (such as Ascon), include sequence numbers or timestamps in the authenticated data, and manage keys per device.
        </p>
      </Callout>
    </div>
  );
}
