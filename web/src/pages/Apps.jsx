import { useState, useEffect } from 'preact/hooks';
import { AppTable } from '../components/AppTable';

export function Apps() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data.json')
      .then((res) => res.json())
      .then((data) => {
        setApps(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load application registry:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-6">
        <div className="h-64 flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
          <span className="text-zinc-500 font-mono text-sm">Querying registry...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black dark:text-white">Monitored Applications</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          Browse all tracked applications and their latest versions. Subscribe to the RSS feed for real-time updates.
        </p>
      </div>
      
      <AppTable apps={apps} />
    </div>
  );
}