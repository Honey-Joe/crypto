import { CircleCheck, Gauge, Timer, Zap } from 'lucide-react';
import useChartTheme from '../../hooks/useChartTheme';
import { formatBytes, formatDuration, formatThroughput } from '../../utils/format';
import { RESULT_METRICS } from '../../utils/metrics';
import { bestOf, isPassed } from '../../utils/results';
import MetricCard from '../ui/MetricCard';

function names(best) {
  return best ? best.names.join(', ') : '–';
}

/** Stat tiles for one message size of a run. */
export default function RunSummary({ results, messageSize, statistic = 'mean' }) {
  const { colorFor } = useChartTheme();
  const atSize = results.filter((result) => result.messageSize === messageSize);
  const fastestEncrypt = bestOf(atSize, (result) => RESULT_METRICS.encrypt.get(result, statistic));
  const fastestDecrypt = bestOf(atSize, (result) => RESULT_METRICS.decrypt.get(result, statistic));
  const topThroughput = bestOf(atSize, (result) => RESULT_METRICS.throughput.get(result, statistic), 'higher');
  const swatch = (best) => {
    if (!best || best.names.length !== 1) return undefined;
    return colorFor(atSize.find((result) => result.displayName === best.names[0])?.algorithm);
  };
  const passed = results.filter(isPassed).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Fastest encryption" value={names(fastestEncrypt)} swatch={swatch(fastestEncrypt)} icon={Timer} hint={fastestEncrypt ? `${formatDuration(fastestEncrypt.value)} ${statistic} for ${formatBytes(messageSize)}` : 'No verified results'} />
      <MetricCard label="Fastest decryption" value={names(fastestDecrypt)} swatch={swatch(fastestDecrypt)} icon={Gauge} hint={fastestDecrypt ? `${formatDuration(fastestDecrypt.value)} ${statistic} for ${formatBytes(messageSize)}` : 'No verified results'} />
      <MetricCard label="Highest throughput" value={names(topThroughput)} swatch={swatch(topThroughput)} icon={Zap} hint={topThroughput ? `${formatThroughput(topThroughput.value)} at ${formatBytes(messageSize)}` : 'No verified results'} />
      <MetricCard label="Round-trip verified" value={`${passed} / ${results.length}`} icon={CircleCheck} hint="Results whose every decryption reproduced the plaintext" />
    </div>
  );
}
