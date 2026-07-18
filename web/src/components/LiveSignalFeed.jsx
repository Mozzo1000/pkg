import { useEffect, useRef, useState } from 'preact/hooks';
import { Activity, Clock, Package } from 'lucide-preact';

const COLORS = [
  'bg-blue-500', 'bg-cyan-500', 'bg-purple-500', 'bg-orange-500',
  'bg-emerald-600', 'bg-sky-500', 'bg-red-600', 'bg-indigo-600',
  'bg-pink-500', 'bg-amber-600',
];

const POOL_SIZE = 8;
const VISIBLE = 4;
const ROTATE_MS = 6000;

export function colorForApp(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return '';

  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

export function LiveSignalFeed() {
  const [pool, setPool] = useState(null); // null = still loading
  const [visible, setVisible] = useState([]);
  const [error, setError] = useState(false);
  const cursorRef = useRef(0);

  useEffect(() => {
    fetch('/apps.json')
      .then((res) => res.json())
      .then((data) => {
        const recent = [...data]
          .filter((app) => app.released_on)
          .sort((a, b) => new Date(b.released_on) - new Date(a.released_on))
          .slice(0, POOL_SIZE)
          .map((app) => ({
            app: app.name,
            version: app.latest_version,
            releasedOn: app.released_on,
            color: colorForApp(app.name),
          }));

        setPool(recent);
        cursorRef.current = Math.min(VISIBLE, recent.length) - 1;
        setVisible(
          recent.slice(0, VISIBLE).map((item, i) => ({ ...item, id: `init-${i}-${item.app}` }))
        );
      })
      .catch((err) => {
        console.error('Failed to load recent updates:', err);
        setError(true);
        setPool([]);
      });
  }, []);

  // Cycle through the real recent-releases pool so the feed keeps "flowing"
  // without inventing any data — every entry shown is a real app/version.
  useEffect(() => {
    if (!pool || pool.length <= VISIBLE) return;

    const interval = setInterval(() => {
      cursorRef.current = (cursorRef.current + 1) % pool.length;
      const next = pool[cursorRef.current];
      setVisible((prev) => [
        { ...next, id: `${next.app}-${Date.now()}` },
        ...prev.slice(0, VISIBLE - 1),
      ]);
    }, ROTATE_MS);

    return () => clearInterval(interval);
  }, [pool]);

  const loading = pool === null;

  return (
    <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 transition-colors">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-50 text-sm uppercase tracking-tight">
          <Activity size={16} className="text-blue-500" />
          Recent Updates
        </div>
      </div>

      <div className="relative flex flex-col gap-3 min-h-85">
        {loading ? (
          Array.from({ length: VISIBLE }).map((_, i) => <SignalRowSkeleton key={i} />)
        ) : visible.length > 0 ? (
          visible.map((update, index) => (
            <div
              key={update.id}
              className="group flex items-center justify-between p-4 rounded border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 animate-signal-flow transition-all duration-500 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`w-1.5 h-8 rounded-full ${update.color} opacity-80 group-hover:opacity-100 transition-opacity`}></div>

                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-none mb-1.5">
                    {update.app}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <Package size={12} className="text-slate-400 dark:text-slate-500" />
                    v{update.version}
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 ${index === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                <Clock size={10} className="opacity-60" />
                {timeAgo(update.releasedOn)}
              </div>
            </div>
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400 font-mono py-12">
            {error ? 'Could not load recent updates.' : 'No updates yet.'}
          </div>
        )}
      </div>
    </div>
  );
}

function SignalRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 shadow-sm animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-1.5 h-8 rounded-full bg-slate-200 dark:bg-slate-800"></div>
        <div>
          <div className="w-28 h-4 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
          <div className="w-16 h-3 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
        </div>
      </div>
      <div className="w-12 h-4 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
    </div>
  );
}
