import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useChartTheme from '../../hooks/useChartTheme';
import ChartTooltip from './ChartTooltip';
import MarkerShape from './MarkerShape';

/**
 * Line chart of a metric against message size.
 * rows: [{ sizeLabel, [seriesKey]: value }]; series: [{ key, algorithm, marker }]
 */
export default function SizeLineChart({ rows, series, formatValue, formatAxis, ariaLabel }) {
  const { chrome, colorFor } = useChartTheme();
  const colorByKey = Object.fromEntries(series.map((item) => [item.key, colorFor(item.algorithm)]));

  return (
    <div className="h-80" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke={chrome.grid} strokeWidth={1} />
          <XAxis dataKey="sizeLabel" tick={{ fill: chrome.tick, fontSize: 11 }} axisLine={{ stroke: chrome.axis }} tickLine={false} />
          <YAxis tick={{ fill: chrome.tick, fontSize: 11 }} tickFormatter={formatAxis} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: chrome.axis, strokeWidth: 1 }}
            content={<ChartTooltip formatValue={formatValue} colorForEntry={(entry) => colorByKey[entry.dataKey]} title={(label) => `Message size ${label}`} />}
          />
          {series.map((item) => (
            <Line
              key={item.key}
              dataKey={item.key}
              name={item.key}
              type="linear"
              stroke={colorByKey[item.key]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls
              isAnimationActive={false}
              dot={({ cx, cy, index }) => <MarkerShape key={`${item.key}-${index}`} shape={item.marker} cx={cx} cy={cy} color={colorByKey[item.key]} ring={chrome.surface} />}
              activeDot={({ cx, cy, index }) => <MarkerShape key={`${item.key}-active-${index}`} shape={item.marker} cx={cx} cy={cy} color={colorByKey[item.key]} ring={chrome.surface} size={6} />}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
