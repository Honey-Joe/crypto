import { useAlgorithms } from '../../hooks/useAppContext';
import { MODE_LABELS } from '../../utils/constants';
import SelectField from '../ui/SelectField';

/**
 * Algorithm + variant (+ optional mode) selects, driven by GET /algorithms.
 * Variants that failed their known-answer self-test are shown but disabled.
 */
export default function AlgorithmPicker({ idPrefix, algorithmId, variantId, onChange, mode, onModeChange, disabled }) {
  const { algorithms, modes } = useAlgorithms();
  const algorithm = algorithms.find((item) => item.id === algorithmId);

  function handleAlgorithm(event) {
    const next = algorithms.find((item) => item.id === event.target.value);
    onChange({ algorithm: next.id, variant: next.defaultVariant });
  }

  return (
    <div className={`grid gap-4 ${onModeChange ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      <SelectField
        id={`${idPrefix}-algorithm`}
        label="Algorithm"
        value={algorithmId}
        onChange={handleAlgorithm}
        disabled={disabled}
        options={algorithms.map((item) => ({ value: item.id, label: item.name }))}
      />
      <SelectField
        id={`${idPrefix}-variant`}
        label="Variant (block / key bits)"
        value={variantId}
        onChange={(event) => onChange({ algorithm: algorithmId, variant: event.target.value })}
        disabled={disabled || !algorithm}
        options={(algorithm?.variants ?? []).map((variant) => ({
          value: variant.id,
          label: `${variant.name}${variant.verified ? '' : ' (failed self-test)'}`,
          disabled: !variant.verified,
        }))}
      />
      {onModeChange && (
        <SelectField
          id={`${idPrefix}-mode`}
          label="Mode of operation"
          value={mode}
          onChange={(event) => onModeChange(event.target.value)}
          disabled={disabled}
          options={(modes.length ? modes : [{ id: 'CBC' }, { id: 'CTR' }, { id: 'ECB' }]).map((item) => ({ value: item.id, label: MODE_LABELS[item.id] ?? item.id }))}
        />
      )}
    </div>
  );
}
