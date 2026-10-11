import { LoaderCircle } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600 disabled:bg-indigo-600/50 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:disabled:bg-indigo-500/40',
  secondary:
    'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 focus-visible:outline-indigo-600 disabled:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:disabled:text-neutral-600',
  ghost:
    'text-neutral-700 hover:bg-neutral-100 focus-visible:outline-indigo-600 disabled:text-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-800',
  danger:
    'border border-red-200 bg-white text-red-700 hover:bg-red-50 focus-visible:outline-red-600 dark:border-red-900 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950/40',
};

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : Icon && <Icon className="size-4" aria-hidden="true" />}
      {children}
    </button>
  );
}
