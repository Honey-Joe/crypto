import { useCallback, useMemo, useState } from 'react';
import { readString, writeString } from '../utils/storage';
import { ThemeContext } from './contexts';

const STORAGE_KEY = 'lca-theme';

function initialTheme() {
  const saved = readString(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const value = initialTheme();
    document.documentElement.classList.toggle('dark', value === 'dark');
    return value;
  });

  const setTheme = useCallback((value) => {
    document.documentElement.classList.toggle('dark', value === 'dark');
    writeString(STORAGE_KEY, value);
    setThemeState(value);
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [setTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
