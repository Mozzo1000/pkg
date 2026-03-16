import { useEffect, useState } from 'preact/hooks';
import { Activity, Clock, Package } from 'lucide-preact';

const initialUpdates = [
    { id: 101, app: 'VS Code', version: '1.86.0', time: '5m ago', color: 'bg-blue-500' },
    { id: 102, app: 'Docker Desktop', version: '4.27.1', time: '12m ago', color: 'bg-cyan-500' },
    { id: 103, app: 'Slack Enterprise', version: '4.37.0', time: '25m ago', color: 'bg-purple-500' },
    { id: 104, app: 'Firefox ESR', version: '115.7.0', time: '45m ago', color: 'bg-orange-500' },
];

const appPool = [
    { app: 'Node.js', version: '20.11.0', color: 'bg-emerald-600' },
    { app: 'Go', version: '1.22.0', color: 'bg-sky-500' },
    { app: 'Git for Windows', version: '2.43.0', color: 'bg-orange-600' },
    { app: 'Postman', version: '10.22.0', color: 'bg-orange-500' },
    { app: 'IntelliJ IDEA', version: '2023.3.3', color: 'bg-red-600' },
    { app: 'Terraform', version: '1.7.3', color: 'bg-purple-600' },
    { app: 'Kubectl', version: '1.29.2', color: 'bg-blue-600' },
    { app: 'Wireshark', version: '4.2.3', color: 'bg-zinc-500' },
    { app: 'Python', version: '3.12.2', color: 'bg-yellow-600' },
    { app: 'Zoom', version: '5.17.5', color: 'bg-sky-400' },
    { app: 'Chrome', version: '121.0.6167', color: 'bg-emerald-500' },
    { app: 'Notion', version: '2.38.2', color: 'bg-zinc-700' },
    { app: 'Microsoft Teams', version: '24012.3', color: 'bg-indigo-600' },
    { app: '1Password', version: '8.10.24', color: 'bg-blue-400' },
    { app: 'Figma', version: '116.15.4', color: 'bg-pink-500' },
];

export function LiveSignalFeed() {
  const [updates, setUpdates] = useState(initialUpdates);

  useEffect(() => {
    const interval = setInterval(() => {
      setUpdates((prev) => {
        let nextApp;
        do {
          nextApp = appPool[Math.floor(Math.random() * appPool.length)];
        } while (nextApp.app === prev[0].app);
        
        const newUpdate = {
          id: Date.now(),
          ...nextApp,
          time: 'Just Now',
        };

        return [newUpdate, ...prev.slice(0, 3)];
      });
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 transition-colors">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-50 text-sm uppercase tracking-tight">
          <Activity size={16} className="text-blue-500" />
          Updates
        </div>
      </div>

      <div className="relative flex flex-col gap-3 min-h-85">
        {updates.map((update, index) => (
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

            <div className={`text-[10px] font-bold font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 ${index === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {update.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}