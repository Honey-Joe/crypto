import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Back to the dashboard
        </Link>
      }
    />
  );
}
