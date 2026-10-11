import { ArrowRight, CircleCheck, CircleX, Lock, LockOpen, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import AlgorithmPicker from '../components/crypto/AlgorithmPicker';
import KeyField from '../components/crypto/KeyField';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Callout from '../components/ui/Callout';
import Card from '../components/ui/Card';
import CopyButton from '../components/ui/CopyButton';
import ErrorMessage from '../components/ui/ErrorMessage';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import PageHeader from '../components/ui/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import TextAreaField from '../components/ui/TextAreaField';
import { useAlgorithms, useToast } from '../hooks/useAppContext';
import useCipherSelection from '../hooks/useCipherSelection';
import { decryptText, encryptText } from '../services/encryptionService';
import { getErrorCode, getErrorMessage } from '../utils/errors';
import { formatBytes, formatDuration, formatThroughput } from '../utils/format';
import { MAX_PLAINTEXT_BYTES, utf8Length, validateCiphertext, validateHexKey, validatePlaintext } from '../utils/validation';

const FORMAT_OPTIONS = [
  { value: 'hex', label: 'Hexadecimal' },
  { value: 'base64', label: 'Base64' },
];

function Detail({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
      <dt className="text-xs text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium tabular">{value}</dd>
    </div>
  );
}

function OutputBox({ value, label }) {
  return (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-sm break-all whitespace-pre-wrap dark:border-neutral-800 dark:bg-neutral-950/60" aria-label={label}>
      {value}
    </div>
  );
}

function Warnings({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <Callout tone="warning" title="Security notes">
      <ul className="list-disc space-y-1 pl-4">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </Callout>
  );
}

function EncryptResult({ result, onSendToDecrypt }) {
  return (
    <Card
      title="Ciphertext"
      icon={Lock}
      description={`${result.displayName} · ${result.mode} · ${result.outputFormat === 'hex' ? 'hexadecimal' : 'Base64'} · layout: ${result.layout}`}
      actions={<Badge tone="success" icon={CircleCheck}>Encrypted</Badge>}
    >
      <div className="space-y-4">
        <OutputBox value={result.ciphertext} label="Ciphertext" />
        <div className="flex flex-wrap gap-2">
          <CopyButton value={result.ciphertext} label="Copy ciphertext" />
          <Button size="sm" icon={ArrowRight} onClick={onSendToDecrypt}>
            Decrypt this ciphertext
          </Button>
        </div>
        {result.iv && (
          <p className="text-xs break-all text-neutral-600 dark:text-neutral-400">
            <span className="font-medium">IV / initial counter (hex):</span> <code>{result.iv}</code> — random for every encryption and stored in front of the ciphertext; it is not secret.
          </p>
        )}
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Detail label="Plaintext" value={formatBytes(result.sizes.plaintextBytes)} />
          <Detail label="Padding added" value={`${result.sizes.paddingBytes} B (${result.padding})`} />
          <Detail label="IV" value={`${result.sizes.ivBytes} B`} />
          <Detail label="Raw ciphertext (incl. IV)" value={formatBytes(result.sizes.rawCiphertextBytes)} />
          <Detail label="Encoded length" value={`${result.sizes.encodedCiphertextChars} chars`} />
          <Detail label="Block size" value={`${result.sizes.blockBytes} B`} />
          <Detail label="Key setup" value={formatDuration(result.timing.keySetupMs)} />
          <Detail label="Encryption time" value={formatDuration(result.timing.encryptionMs)} />
          <Detail label="Throughput (single op)" value={formatThroughput(result.timing.throughputBytesPerSec)} />
        </dl>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{result.timing.note}</p>
        <Warnings warnings={result.warnings} />
      </div>
    </Card>
  );
}

function DecryptResult({ result }) {
  const verification = result.verification;
  return (
    <Card
      title="Recovered plaintext"
      icon={LockOpen}
      description={`${result.displayName} · ${result.mode} · input ${result.inputFormat}`}
      actions={
        verification ? (
          verification.matches ? (
            <Badge tone="success" icon={CircleCheck}>Matches original</Badge>
          ) : (
            <Badge tone="danger" icon={CircleX}>Does not match</Badge>
          )
        ) : (
          <Badge tone="info">Decrypted</Badge>
        )
      }
    >
      <div className="space-y-4">
        {verification && (
          <Callout tone={verification.matches ? 'success' : 'danger'} title={verification.matches ? 'Verification passed' : 'Verification failed'}>
            <p>{verification.message}</p>
          </Callout>
        )}
        <OutputBox value={result.plaintext} label="Recovered plaintext" />
        <div className="flex flex-wrap gap-2">
          <CopyButton value={result.plaintext} label="Copy plaintext" />
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">Show recovered bytes (hex)</summary>
          <div className="mt-2">
            <OutputBox value={result.plaintextHex} label="Recovered bytes in hex" />
          </div>
        </details>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Detail label="Ciphertext received" value={formatBytes(result.sizes.ciphertextBytes)} />
          <Detail label="Recovered plaintext" value={formatBytes(result.sizes.plaintextBytes)} />
          <Detail label="Valid UTF-8" value={result.validUtf8 ? 'Yes' : 'No'} />
          <Detail label="Key setup" value={formatDuration(result.timing.keySetupMs)} />
          <Detail label="Decryption time" value={formatDuration(result.timing.decryptionMs)} />
          <Detail label="Throughput (single op)" value={formatThroughput(result.timing.throughputBytesPerSec)} />
        </dl>
        <Warnings warnings={result.warnings} />
      </div>
    </Card>
  );
}

function ExplanationPanel({ variant, mode, modes }) {
  const modeInfo = modes.find((item) => item.id === mode);
  const blockBytes = variant ? variant.blockBits / 8 : 8;
  const example = 15;
  const padded = example + (blockBytes - (example % blockBytes));
  return (
    <div className="space-y-4">
      <Card title="How this works" icon={ShieldAlert}>
        <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
          {variant && (
            <p>
              <span className="font-semibold">{variant.name}</span> encrypts fixed {blockBytes}-byte blocks with a {variant.keyBits}-bit key over {variant.rounds} rounds. A message
              of any length must therefore be split into blocks by a <span className="font-semibold">mode of operation</span>.
            </p>
          )}
          {modeInfo && (
            <p>
              <span className="font-semibold">{modeInfo.id} ({modeInfo.name}):</span> {modeInfo.description}
            </p>
          )}
          <p>
            <span className="font-semibold">Padding:</span>{' '}
            {mode === 'CTR'
              ? 'CTR needs no padding — the ciphertext is exactly as long as the message (plus the IV).'
              : `PKCS#7 adds 1 to ${blockBytes} bytes, each equal to the number added. A ${example}-byte message becomes ${padded} bytes. If the message already fills whole blocks, a full extra block is added so padding can always be removed.`}
          </p>
          <p>
            <span className="font-semibold">Output:</span> {modeInfo?.layout ?? 'IV || ciphertext'}, encoded as hexadecimal (2 characters per byte) or Base64 (4 characters per 3 bytes). Encoding is not encryption.
          </p>
        </div>
      </Card>
      <Callout tone="warning" title="Encryption is not integrity">
        <p>
          These modes keep data confidential but do not detect tampering. An attacker can modify ciphertext and the receiver may not notice. Real IoT systems should use an authenticated mode (for
          example Ascon-AEAD, AES-GCM or AES-CCM) or add a MAC.
        </p>
      </Callout>
      {variant?.blockBits <= 32 && (
        <Callout tone="danger" title="32-bit block size">
          <p>With only 2^32 possible blocks, collisions become likely after about 2^16 blocks (256 KiB) under one key. Use these variants only for very small amounts of data.</p>
        </Callout>
      )}
      {mode === 'ECB' && (
        <Callout tone="danger" title="ECB reveals patterns">
          <p>Identical plaintext blocks produce identical ciphertext blocks. Try encrypting “AAAAAAAAAAAAAAAA” to see the repetition.</p>
        </Callout>
      )}
    </div>
  );
}

export default function EncryptDecrypt() {
  const toast = useToast();
  const { loading: algorithmsLoading, error: algorithmsError, reload, modes } = useAlgorithms();
  const cipher = useCipherSelection('XTEA');
  const [operation, setOperation] = useState('encrypt');

  const [plaintext, setPlaintext] = useState('Temperature=32.5C; Humidity=68%; Soil=42%; AQI=85');
  const [outputFormat, setOutputFormat] = useState('hex');
  const [encryptState, setEncryptState] = useState({ loading: false, error: null, result: null });

  const [ciphertext, setCiphertext] = useState('');
  const [inputFormat, setInputFormat] = useState('hex');
  const [expected, setExpected] = useState('');
  const [decryptState, setDecryptState] = useState({ loading: false, error: null, errorCode: null, result: null });
  const [submitted, setSubmitted] = useState(false);

  const keyError = validateHexKey(cipher.key, cipher.expectedHexLength);
  const plaintextError = validatePlaintext(plaintext);
  const ciphertextError = validateCiphertext(ciphertext, inputFormat);

  function cipherParams() {
    return { algorithm: cipher.algorithm, variant: cipher.variantId, mode: cipher.mode, key: cipher.key.replace(/\s+/g, '') };
  }

  async function handleEncrypt(event) {
    event.preventDefault();
    setSubmitted(true);
    if (keyError || plaintextError) return;
    setEncryptState({ loading: true, error: null, result: null });
    try {
      const result = await encryptText({ ...cipherParams(), plaintext, outputFormat });
      setEncryptState({ loading: false, error: null, result });
      toast.success('Encryption succeeded', `${result.displayName} produced ${result.sizes.rawCiphertextBytes} bytes of ciphertext.`);
    } catch (error) {
      setEncryptState({ loading: false, error: getErrorMessage(error), result: null });
    }
  }

  async function handleDecrypt(event) {
    event.preventDefault();
    setSubmitted(true);
    if (keyError || ciphertextError) return;
    setDecryptState({ loading: true, error: null, errorCode: null, result: null });
    try {
      const result = await decryptText({
        ...cipherParams(),
        ciphertext: ciphertext.replace(/\s+/g, ''),
        inputFormat,
        ...(expected ? { expectedPlaintext: expected } : {}),
      });
      setDecryptState({ loading: false, error: null, errorCode: null, result });
      if (result.verification && !result.verification.matches) toast.warning('Decrypted, but the text does not match the original');
      else toast.success('Decryption succeeded');
    } catch (error) {
      setDecryptState({ loading: false, error: getErrorMessage(error), errorCode: getErrorCode(error), result: null });
    }
  }

  function sendToDecrypt() {
    const result = encryptState.result;
    setCiphertext(result.ciphertext);
    setInputFormat(result.outputFormat);
    setExpected(plaintext);
    setDecryptState({ loading: false, error: null, errorCode: null, result: null });
    setOperation('decrypt');
  }

  if (algorithmsLoading) return <LoadingIndicator label="Loading algorithms from the API…" />;
  if (algorithmsError) return <ErrorMessage title="Could not load algorithms" message={algorithmsError} onRetry={reload} />;

  const showErrors = submitted;
  const plaintextBytes = utf8Length(plaintext);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Encrypt / Decrypt"
        description="Encrypt a message with a lightweight block cipher implemented on the server, then decrypt it and verify the result. Every operation is a real cipher computation, not an encoding."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card
            title={operation === 'encrypt' ? 'Encrypt a message' : 'Decrypt a ciphertext'}
            actions={
              <SegmentedControl
                ariaLabel="Operation"
                value={operation}
                onChange={setOperation}
                options={[
                  { value: 'encrypt', label: 'Encrypt', icon: Lock },
                  { value: 'decrypt', label: 'Decrypt', icon: LockOpen },
                ]}
              />
            }
          >
            <form onSubmit={operation === 'encrypt' ? handleEncrypt : handleDecrypt} className="space-y-5" noValidate>
              <AlgorithmPicker
                idPrefix="crypto"
                algorithmId={cipher.algorithm}
                variantId={cipher.variantId ?? ''}
                onChange={cipher.setSelection}
                mode={cipher.mode}
                onModeChange={cipher.setMode}
              />
              <KeyField
                id="crypto-key"
                value={cipher.key}
                onChange={cipher.setKey}
                expectedHexLength={cipher.expectedHexLength}
                onGenerate={cipher.regenerateKey}
                generating={cipher.generating}
                showValidation={showErrors || cipher.key.length > 0}
              />

              {operation === 'encrypt' ? (
                <>
                  <TextAreaField
                    id="plaintext"
                    label="Plaintext (UTF-8)"
                    rows={5}
                    value={plaintext}
                    onChange={(event) => setPlaintext(event.target.value)}
                    error={showErrors ? plaintextError : null}
                    trailing={
                      <span className="text-xs text-neutral-500 tabular">
                        {plaintextBytes} / {MAX_PLAINTEXT_BYTES} bytes
                      </span>
                    }
                  />
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="mb-1.5 text-sm font-medium">Output format</p>
                      <SegmentedControl ariaLabel="Output format" value={outputFormat} onChange={setOutputFormat} options={FORMAT_OPTIONS} />
                    </div>
                    <Button type="submit" icon={Lock} loading={encryptState.loading}>
                      Encrypt
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <TextAreaField
                    id="ciphertext"
                    label="Ciphertext (including the IV prefix)"
                    rows={4}
                    value={ciphertext}
                    onChange={(event) => setCiphertext(event.target.value)}
                    error={showErrors ? ciphertextError : null}
                    inputClassName="font-mono"
                    placeholder="Paste the ciphertext produced by the Encrypt tab"
                  />
                  <TextAreaField
                    id="expected"
                    label="Original plaintext (optional, for verification)"
                    rows={2}
                    value={expected}
                    onChange={(event) => setExpected(event.target.value)}
                    hint="If provided, the server checks the recovered text byte-for-byte against it."
                  />
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="mb-1.5 text-sm font-medium">Ciphertext format</p>
                      <SegmentedControl ariaLabel="Ciphertext format" value={inputFormat} onChange={setInputFormat} options={FORMAT_OPTIONS} />
                    </div>
                    <Button type="submit" icon={LockOpen} loading={decryptState.loading}>
                      Decrypt
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Card>

          {operation === 'encrypt' && (
            <>
              {encryptState.error && <ErrorMessage title="Encryption failed" message={encryptState.error} />}
              {encryptState.result && <EncryptResult result={encryptState.result} onSendToDecrypt={sendToDecrypt} />}
            </>
          )}
          {operation === 'decrypt' && (
            <>
              {decryptState.error && (
                <ErrorMessage
                  title="Decryption failed"
                  message={
                    decryptState.errorCode === 'INVALID_PADDING'
                      ? `${decryptState.error} No plaintext is shown because the result could not be validated.`
                      : decryptState.error
                  }
                />
              )}
              {decryptState.result && <DecryptResult result={decryptState.result} />}
            </>
          )}
        </div>

        <ExplanationPanel variant={cipher.variant} mode={cipher.mode} modes={modes} />
      </div>
    </div>
  );
}
