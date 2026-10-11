import { useMemo } from 'react';
import { formatBytes } from '../../utils/format';
import { formattersFor, RESULT_METRICS } from '../../utils/metrics';
import { isPassed, markerFor, sortResults } from '../../utils/results';
import ChartContainer from './ChartContainer';
import ChartLegend from './ChartLegend';
import SizeLineChart from './SizeLineChart';

/** Encryption throughput as the message size grows (one line per algorithm variant). */
export default function ThroughputBySizeChart({ results, statistic = 'mean' }) {
  const { rows, series, formatters } = useMemo(() => {
    const passed = sortResults(results.filter(isPassed));
    const sizes = [...new Set(passed.map((result) => result.messageSize))].sort((a, b) => a - b);
    const values = passed.map((result) => RESULT_METRICS.throughput.get(result, statistic));
    const f = formattersFor('throughput', values);

    const names = [...new Set(passed.map((result) => result.displayName))];
    const perAlgorithmCount = {};
    const seriesList = names.map((name) => {
      const algorithm = passed.find((result) => result.displayName === name).algorithm;
      const index = perAlgorithmCount[algorithm] ?? 0;
      perAlgorithmCount[algorithm] = index + 1;
      return { key: name, algorithm, marker: markerFor(index) };
    });

    const rowList = sizes.map((size) => {
      const row = { sizeLabel: formatBytes(size) };
      for (const result of passed.filter((item) => item.messageSize === size)) {
        row[result.displayName] = f.scale(RESULT_METRICS.throughput.get(result, statistic));
      }
      return row;
    });
    return { rows: rowList, series: seriesList, formatters: f };
  }, [results, statistic]);

  return (
    <ChartContainer
      title="Throughput vs message size"
      subtitle={`Encryption throughput (${formatters.unit}) · higher is better`}
      isEmpty={rows.length < 2}
      emptyMessage="Run a benchmark with at least two message sizes to see how throughput scales."
      footer="Small messages are dominated by fixed per-call costs (allocation, padding, IV handling), so throughput rises with message size."
    >
      <div className="mb-3">
        <ChartLegend kind="line" items={series.map((item) => ({ key: item.key, label: item.key, algorithm: item.algorithm, marker: item.marker }))} />
      </div>
      <SizeLineChart
        rows={rows}
        series={series}
        formatValue={formatters.formatValue}
        formatAxis={formatters.formatAxis}
        ariaLabel="Line chart of encryption throughput against message size. Values are also listed in the results table."
      />
    </ChartContainer>
  );
}
