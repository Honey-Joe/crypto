import { createContext } from 'react';

// Context objects live here so provider files only export components (keeps Fast Refresh happy).
export const ThemeContext = createContext(null);
export const ToastContext = createContext(null);
export const AlgorithmsContext = createContext(null);
export const BenchmarkHistoryContext = createContext(null);
