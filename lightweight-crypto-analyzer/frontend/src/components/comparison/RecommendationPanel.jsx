import { Award, Scale, ShieldAlert, TriangleAlert } from 'lucide-react';
import useChartTheme from '../../hooks/useChartTheme';
import { WEIGHT_PRESETS } from '../../utils/constants';
import { formatBytes, formatDuration, formatThroughput } from '../../utils/format';
import Badge from '../ui/Badge';
import Callout from '../ui/Callout';
import Card from '../ui/Card';
import ErrorMessage from '../ui/ErrorMessage';
import LoadingIndicator from '../ui/LoadingIndicator';
import SegmentedControl from '../ui/SegmentedControl';

const CRITERIA_LABELS = {
  encryption: 'Encryption time',
  decryption: 'Decryption time',
  keySetup: 'Key setup time',
  ciphertextSize: 'Ciphertext size',
  roundKeyMemory: 'Round-key storage',
};

const WINNER_ROWS = [
  ['encryption', 'Fastest measured encryption', formatDuration],
  ['decryption', 'Fastest measured decryption', formatDuration],
  ['throughput', 'Highest measured throughput', formatThroughput],
  ['ciphertextSize', 'Smallest ciphertext', formatBytes],
  ['roundKeyMemory', 'Smallest round-key storage', formatBytes],
  ['keySetup', 'Fastest key setup', formatDuration],
];

function WeightEditor({ preset, weights, onPreset, onWeight }) {
  return (
    <div className="space-y-3">
      <SegmentedControl
        ariaLabel="Weighting preset"
        size="sm"
        value={preset}
        onChange={onPreset}
        options={[...Object.entries(WEIGHT_PRESETS).map(([value, item]) => ({ value, label: item.label })), { value: 'custom', label: 'Custom' }]}
      />
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {Object.entries(CRITERIA_LABELS).map(([criterion, label]) => (
          <label key={criterion} className="flex items-center gap-3 text-sm">
            <span className="w-36 shrink-0 text-neutral-700 dark:text-neutral-300">{label}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={weights[criterion]}
              onChange={(event) => onWeight(criterion, Number(event.target.value))}
              className="min-w-0 flex-1 accent-indigo-600"
              aria-label={`${label} weight`}
            />
            <span className="w-8 text-right text-xs text-neutral-500 tabular">{weights[criterion]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ScoreRanking({ ranking, colorFor }) {
  return (
    <ol className="space-y-2">
      {ranking.map((entry, index) => (
        <li key={entry.displayName} className="flex items-center gap-3 text-sm">
          <span className="w-5 text-right text-xs text-neutral-500 tabular">{index + 1}</span>
          <span className="w-28 shrink-0 truncate font-medium">{entry.displayName}</span>
          <div className="h-2 min-w-0 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden="true">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(2, entry.score ?? 0)}%`, backgroundColor: colorFor(entry.algorithm) }} />
          </div>
          <span className="w-12 text-right text-xs font-semibold tabular">{entry.score?.toFixed(1) ?? '–'}</span>
        </li>
      ))}
    </ol>
  );
}

/** Performance recommendation computed by POST /compare for the selected results. */
export default function RecommendationPanel({ state, preset, weights, onPreset, onWeight }) {
  const { colorFor } = useChartTheme();
  const group = state.data?.groups?.[0];

  return (
    <Card
      title="Recommendation"
      icon={Award}
      description="Ranks the selected results by measured performance under the weights you choose. This is not a security ranking."
    >
      <div className="space-y-5">
        <WeightEditor preset={preset} weights={weights} onPreset={onPreset} onWeight={onWeight} />

        {state.error && <ErrorMessage title="Comparison failed" message={state.error} />}
        {state.loading && !group && <LoadingIndicator label="Comparing results…" />}

        {group && (
          <div className={`space-y-5 transition-opacity ${state.loading ? 'opacity-50' : ''}`}>
            {group.recommendation && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <p className="text-xs font-medium tracking-wide text-indigo-700 uppercase dark:text-indigo-300">Best overall under the selected criteria</p>
                <p className="mt-1 text-xl font-semibold">{group.recommendation.best.join(' · ')}</p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{group.recommendation.explanation}</p>
              </div>
            )}

            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {WINNER_ROWS.map(([metric, label, format]) => {
                const winner = group.winners[metric];
                return (
                  <div key={metric} className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
                    <dt className="text-xs text-neutral-500 dark:text-neutral-400">{label}</dt>
                    <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {winner ? winner.winners.join(', ') : '–'}
                      {winner?.tie && <Badge tone="neutral">tie</Badge>}
                    </dd>
                    {winner && <dd className="text-xs text-neutral-500 tabular dark:text-neutral-400">{format(winner.value)}</dd>}
                  </div>
                );
              })}
            </dl>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{group.throughputNote}</p>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Scale className="size-4" aria-hidden="true" /> Weighted score (100 = best on every weighted criterion)
              </p>
              <ScoreRanking ranking={group.ranking} colorFor={colorFor} />
            </div>

            {Object.values(group.winners).some((winner) => winner?.closeCall) && (
              <Callout tone="info" title="Close calls">
                <ul className="list-disc space-y-1 pl-4">
                  {Object.values(group.winners)
                    .filter((winner) => winner?.closeCall)
                    .map((winner) => (
                      <li key={winner.metric}>{winner.closeCall}</li>
                    ))}
                </ul>
              </Callout>
            )}

            {group.warnings.length > 0 && (
              <Callout tone="warning" title="Comparability warnings" icon={TriangleAlert}>
                <ul className="list-disc space-y-1 pl-4">
                  {group.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </Callout>
            )}

            {state.data.excluded.length > 0 && (
              <Callout tone="danger" title="Excluded results">
                <ul className="list-disc space-y-1 pl-4">
                  {state.data.excluded.map((item) => (
                    <li key={`${item.displayName}-${item.messageSize}`}>
                      {item.displayName}: {item.reason}
                    </li>
                  ))}
                </ul>
              </Callout>
            )}

            <Callout tone="danger" title="Security considerations (independent of performance)" icon={ShieldAlert}>
              <p>{state.data.disclaimer}</p>
              {group.securityContext.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {group.securityContext.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </Callout>
          </div>
        )}
      </div>
    </Card>
  );
}
