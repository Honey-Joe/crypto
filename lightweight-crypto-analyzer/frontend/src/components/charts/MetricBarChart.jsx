import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useChartTheme from '../../hooks/useChartTheme';
import ChartTooltip from './ChartTooltip';

const ROW_HEIGHT = 34;
const AXIS_BAND = 36;

/**
 * Horizontal bar chart: one bar per algorithm variant, coloured by algorithm family.
 * data: [{ name, algorithm, value }]. Values are labelled at the bar tip.
 */
export default function MetricBarChart({ data, formatValue, formatAxis, ariaLabel }) {
  const { chrome, colorFor } = useChartTheme();
  const height = data.length * ROW_HEIGHT + AXIS_BAND;

  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 76, bottom: 4, left: 4 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={chrome.grid} strokeWidth={1} />
          <XAxis
            type="number"
            tick={{ fill: chrome.tick, fontSize: 11 }}
            tickFormatter={formatAxis}
            axisLine={{ stroke: chrome.axis }}
            tickLine={false}
            allowDecimals
          />
          <YAxis
            type="category"
            dataKey="name"
            width={104}
            tick={{ fill: chrome.label, fontSize: 12 }}
            axisLine={{ stroke: chrome.axis }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: chrome.cursor }}
            isAnimationActive={false}
            content={<ChartTooltip formatValue={formatValue} colorForEntry={(entry) => colorFor(entry.payload?.algorithm)} title={() => null} />}
          />
          <Bar dataKey="value" maxBarSize={22} radius={[0, 4, 4, 0]} isAnimationActive={false} activeBar={{ fillOpacity: 0.8 }}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={colorFor(entry.algorithm)} />
            ))}
            <LabelList dataKey="value" position="right" formatter={formatValue} style={{ fill: chrome.label, fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
