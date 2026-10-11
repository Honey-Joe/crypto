import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from './contexts';

const STYLES = {
  success: { icon: CircleCheck, accent: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: CircleAlert, accent: 'text-red-600 dark:text-red-400' },
  warning: { icon: TriangleAlert, accent: 'text-amber-600 dark:text-amber-400' },
  info: { icon: Info, accent: 'text-indigo-600 dark:text-indigo-400' },
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (type, title, message) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, type, title, message }]);
      setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (title, message) => notify('success', title, message),
      error: (title, message) => notify('error', title, message),
      warning: (title, message) => notify('warning', title, message),
      info: (title, message) => notify('info', title, message),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4">
        {toasts.map((toast) => {
          const { icon: Icon, accent } = STYLES[toast.type];
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${accent}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.message && <p className="mt-0.5 text-sm break-words text-neutral-600 dark:text-neutral-400">{toast.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
