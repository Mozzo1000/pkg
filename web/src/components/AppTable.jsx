import { useState, useMemo, useEffect } from 'preact/hooks';
import { 
  ExternalLink, ScrollText, Calendar, ShieldAlert, 
  AlertTriangle, Search, Filter, ArrowUpDown, Bell 
} from 'lucide-preact';
import { supabase } from '../lib/supabase'; // Ensure this path matches your setup

export function AppTable({ apps }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortType, setSortType] = useState('newest');
  
  // Auth & Subscription State
  const [user, setUser] = useState(null);
  const [userSubs, setUserSubs] = useState([]);

  // 1. Initial Auth Check & Subscription Fetch
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchSubscriptions(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchSubscriptions(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchSubscriptions(userId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('app_name')
      .eq('user_id', userId);
    if (data) setUserSubs(data.map(s => s.app_name));
  }

  // 2. Toggle Notification logic
  async function toggleNotification(appName) {
    if (!user) {
      // Redirect to notifications page to login
      window.location.href = '/notifications';
      return;
    }

    const isSubscribed = userSubs.includes(appName);

    if (isSubscribed) {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('app_name', appName);
      
      if (!error) setUserSubs(prev => prev.filter(name => name !== appName));
    } else {
      const { error } = await supabase
        .from('subscriptions')
        .insert({ user_id: user.id, app_name: appName });
      
      if (!error) setUserSubs(prev => [...prev, appName]);
    }
  }

  const processedApps = useMemo(() => {
    return apps
      .filter(app => {
        const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = 
          filterType === 'all' || 
          (filterType === 'security' && app.security) || 
          (filterType === 'breaking' && app.breaking);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortType === 'name') return a.name.localeCompare(b.name);
        const dateA = new Date(a.released_on || 0);
        const dateB = new Date(b.released_on || 0);
        return sortType === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [apps, searchTerm, filterType, sortType]);

  return (
    <div className="space-y-4">
      {/* Control Bar (Unchanged) */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text"
            placeholder="Search registry..."
            value={searchTerm}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-40">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
            <select value={filterType} onChange={(e) => setFilterType(e.currentTarget.value)} className="w-full pl-9 pr-8 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm appearance-none focus:outline-none cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <option value="all">All Updates</option>
              <option value="security">Security Only</option>
              <option value="breaking">Breaking Only</option>
            </select>
          </div>
          <div className="relative flex-1 sm:w-40">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
            <select value={sortType} onChange={(e) => setSortType(e.currentTarget.value)} className="w-full pl-9 pr-8 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm appearance-none focus:outline-none cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Sort A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm bg-white dark:bg-zinc-950">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-6 py-4 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">Application</th>
              <th className="px-6 py-4 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">Latest Version</th>
              <th className="px-6 py-4 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">Released</th>
              <th className="px-6 py-4 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500 text-right">Resources</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {processedApps.length > 0 ? (
              processedApps.map((app) => {
                const isSubscribed = userSubs.includes(app.name);
                return (
                  <tr key={app.name} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleNotification(app.name)}
                          className={`p-1.5 rounded-md transition-all ${
                            isSubscribed 
                              ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' 
                              : 'text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-100'
                          }`}
                          title={isSubscribed ? "Disable notifications" : "Enable notifications"}
                        >
                          <Bell size={16} fill={isSubscribed ? "currentColor" : "none"} />
                        </button>
                        <span className="font-bold text-black dark:text-white">{app.name}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono border border-zinc-200 dark:border-zinc-700">
                          {app.latest_version}
                        </code>
                        {app.security && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                            <ShieldAlert size={12} /> Security
                          </span>
                        )}
                        {app.breaking && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle size={12} /> Breaking
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                        <Calendar size={12} className="opacity-50" />
                        {app.released_on}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <a href={app.metadata?.homepage} target="_blank" rel="noopener noreferrer" className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                          <ExternalLink size={16} />
                        </a>
                        <a href={app.release_notes} target="_blank" rel="noopener noreferrer" className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                          <ScrollText size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="text-zinc-400 font-mono text-sm">No applications matching your criteria</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}