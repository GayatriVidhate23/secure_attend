import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { useLocation } from 'react-router-dom';

export default function MissingFeatures() {
  const location = useLocation();
  const featureName = location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Feature';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{featureName}</h1>
        <p className="text-slate-500 dark:text-slate-400">This module is currently unavailable.</p>
      </div>

      <Card className="border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} />
          </div>
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Backend API Unavailable</h4>
          <p className="text-slate-500 dark:text-slate-400 max-w-md">
            The documentation specifies this feature, but the current backend does not expose the required API endpoints to support it. 
            Modifications to the backend are strictly prohibited during this implementation phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
