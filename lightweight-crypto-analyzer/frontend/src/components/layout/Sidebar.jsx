import { ShieldCheck, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navigation';

function NavItems({ onNavigate }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50'
            }`
          }
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="rounded-lg bg-indigo-600 p-1.5 text-white dark:bg-indigo-500">
        <ShieldCheck className="size-5" aria-hidden="true" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold">LWC Analyzer</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">IoT cryptography lab</p>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
      Based on Thakor, Razzaque &amp; Khandaker, <span className="italic">IEEE Access</span> 9 (2021). Software measurements only.
    </p>
  );
}

/** Fixed sidebar on large screens; slide-over drawer on small screens. */
export default function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-neutral-200 bg-white px-4 py-5 lg:flex dark:border-neutral-800 dark:bg-neutral-900">
        <Brand />
        <NavItems />
        <div className="mt-auto">
          <Footer />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-neutral-950/50" aria-label="Close navigation" onClick={onClose} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col gap-6 bg-white px-4 py-5 shadow-xl dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavItems onNavigate={onClose} />
            <div className="mt-auto">
              <Footer />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
