import { ArrowRight, CircleCheck, CircleX } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import ErrorMessage from '../components/ui/ErrorMessage';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import PageHeader from '../components/ui/PageHeader';
import { useAlgorithms } from '../hooks/useAppContext';
import useChartTheme from '../hooks/useChartTheme';
import { ALGORITHM_ORDER } from '../utils/constants';

export default function AlgorithmInfo() {
  const { algorithms, loading, error, reload } = useAlgorithms();
  const { colorFor } = useChartTheme();

  if (loading) return <LoadingIndicator label="Loading algorithms…" />;
  if (error) return <ErrorMessage title="Could not load algorithms" message={error} onRetry={reload} />;

  const sorted = [...algorithms].sort((a, b) => ALGORITHM_ORDER.indexOf(a.id) - ALGORITHM_ORDER.indexOf(b.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Algorithm Information"
        description="Design, parameters, intended use, literature findings, measured performance and security limitations of each implemented cipher."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {sorted.map((algorithm) => (
          <Link
            key={algorithm.id}
            to={`/algorithms/${algorithm.id}`}
            className="group flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <span className="size-3 rounded-sm" style={{ backgroundColor: colorFor(algorithm.id) }} aria-hidden="true" />
                  {algorithm.name}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {algorithm.fullName} · {algorithm.year}
                </p>
              </div>
              {algorithm.implementationStatus === 'verified' ? (
                <Badge tone="success" icon={CircleCheck}>Verified</Badge>
              ) : (
                <Badge tone="danger" icon={CircleX}>Self-test failed</Badge>
              )}
            </div>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{algorithm.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Badge>{algorithm.family}</Badge>
              {algorithm.variants.map((variant) => (
                <Badge key={variant.id} tone={variant.verified ? 'info' : 'danger'}>
                  {variant.name} · {variant.rounds} rounds
                </Badge>
              ))}
            </div>
            <span className="mt-auto flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              View details <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
