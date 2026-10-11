import { useContext } from 'react';
import { AlgorithmsContext, BenchmarkHistoryContext, ThemeContext, ToastContext } from '../context/contexts';

function useRequiredContext(context, name) {
  const value = useContext(context);
  if (!value) throw new Error(`${name} must be used inside its provider`);
  return value;
}

export const useTheme = () => useRequiredContext(ThemeContext, 'useTheme');
export const useToast = () => useRequiredContext(ToastContext, 'useToast');
export const useAlgorithms = () => useRequiredContext(AlgorithmsContext, 'useAlgorithms');
export const useBenchmarkHistory = () => useRequiredContext(BenchmarkHistoryContext, 'useBenchmarkHistory');
