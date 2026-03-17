import { useState, useEffect } from 'preact/hooks';
import { AppTable } from '../components/AppTable';
import { Button } from '../components/Button';
import { Rss, Braces } from 'lucide-preact';

export function Apps() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/apps.json')
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

  return (
    <div className="container mx-auto py-12 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">Applications</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Browse all tracked applications and their latest versions. Subscribe to the RSS feed for real-time updates.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <Button href="/feed.xml" target="_blank" variant="secondary" icon={Rss}>
              RSS Feed
            </Button>
          </div>
          <div className="flex-1 md:flex-none">
            <Button href="/apps.json" target="_blank" variant="secondary" icon={Braces}>
              JSON
            </Button>
          </div>
        </div>
      </div>

      
      
      <AppTable apps={apps} loading={loading} />
    </div>
  );
}