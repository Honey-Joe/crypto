import { useMemo } from 'react';
import { formattersFor, RESULT_METRICS } from '../../utils/metrics';
import { isPassed } from '../../utils/results';
import ChartContainer from './ChartContainer';
import MetricBarChart from './MetricBarChart';

/** One chart card for one metric across the given (single message size) results. */
export default function ResultBarChart({ results, metric, statistic = 'mean', title, subtitle, footer, actions }) {
  const definition = RESULT_METRICS[metric];
  const { data, formatters } = useMemo(() => {
    const usable = results.filter(isPassed).map((result) => ({ result, raw: definition.get(result, statistic) }));
    const valid = usable.filter((entry) => Number.isFinite(entry.raw));
    const f = formattersFor(definition.kind, valid.map((entry) => entry.raw));
    return {
      formatters: f,
      data: valid.map(({ result, raw }) => ({ name: result.displayName, algorithm: result.algorithm, value: f.scale(raw) })),
    };
  }, [results, definition, statistic]);

  const unitSuffix = formatters.unit === 'bytes' ? 'bytes' : formatters.unit;
  return (
    <ChartContainer
      title={title ?? definition.label}
      subtitle={subtitle ?? `${definition.better === 'lower' ? 'Lower' : 'Higher'} is better · ${unitSuffix}`}
      isEmpty={data.length === 0}
      footer={footer}
      actions={actions}
    >
      <MetricBarChart
        data={data}
        formatValue={formatters.formatValue}
        formatAxis={formatters.formatAxis}
        ariaLabel={`${title ?? definition.label} bar chart. Values are also listed in the results table.`}
      />
    </ChartContainer>
  );
}
