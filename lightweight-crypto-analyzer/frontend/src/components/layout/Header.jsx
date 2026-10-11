import { Menu, Moon, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useAppContext';
import useBackendHealth from '../../hooks/useBackendHealth';
import { NAV_ITEMS } from './navigation';

function BackendStatus() {
  const { state, recheck } = useBackendHealth();
  const styles = {
    online: { dot: 'bg-emerald-500', text: 'API online' },
    offline: { dot: 'bg-red-500', text: 'API offline' },
    checking: { dot: 'bg-neutral-400 animate-pulse', text: 'Checking API' },
  }[state];
  return (
    <button
      type="button"
      onClick={recheck}
      title="Click to check the backend again"
      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      <span className={`size-2 rounded-full ${styles.dot}`} aria-hidden="true" />
      {styles.text}
    </button>
  );
}

export default function Header({ onOpenMenu }) {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white/85 px-4 backdrop-blur sm:px-6 dark:border-neutral-800 dark:bg-neutral-900/85">
      <button
        type="button"
        onClick={onOpenMenu}
        className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 lg:hidden dark:text-neutral-300 dark:hover:bg-neutral-800"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>
      <p className="min-w-0 truncate text-sm font-medium text-neutral-600 dark:text-neutral-300">{current?.label ?? 'Lightweight Crypto Analyzer'}</p>
      <div className="ml-auto flex items-center gap-2">
        <BackendStatus />
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </div>
    </header>
  );
}
