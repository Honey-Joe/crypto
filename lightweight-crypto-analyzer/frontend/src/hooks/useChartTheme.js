import { useMemo } from 'react';
import { CHART_CHROME, SERIES_COLORS } from '../utils/constants';
import { useTheme } from './useAppContext';

/** Concrete chart colours for the active theme (each algorithm keeps one fixed colour). */
export default function useChartTheme() {
  const { theme } = useTheme();
  return useMemo(() => {
    const series = SERIES_COLORS[theme];
    return {
      theme,
      series,
      chrome: CHART_CHROME[theme],
      colorFor: (algorithm) => series[algorithm] ?? CHART_CHROME[theme].tick,
    };
  }, [theme]);
}
