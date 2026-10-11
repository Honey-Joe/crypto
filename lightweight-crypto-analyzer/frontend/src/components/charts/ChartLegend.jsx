import useChartTheme from '../../hooks/useChartTheme';
import MarkerShape from './MarkerShape';

/**
 * Legend. kind="rect" mirrors bar marks (one swatch per algorithm);
 * kind="line" mirrors line marks (line key + marker per variant).
 * items: [{ key, label, algorithm, marker? }]
 */
export default function ChartLegend({ items, kind = 'rect' }) {
  const { colorFor, chrome } = useChartTheme();
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          {kind === 'rect' ? (
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: colorFor(item.algorithm) }} aria-hidden="true" />
          ) : (
            <svg width="22" height="12" aria-hidden="true">
              <line x1="1" y1="6" x2="21" y2="6" stroke={colorFor(item.algorithm)} strokeWidth="2" strokeLinecap="round" />
              <MarkerShape shape={item.marker} cx={11} cy={6} color={colorFor(item.algorithm)} ring={chrome.surface} size={3.5} />
            </svg>
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
