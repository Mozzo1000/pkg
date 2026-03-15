import { useState, useMemo, useEffect } from 'preact/hooks';
import { 
  ExternalLink, ScrollText, Calendar, ShieldAlert, 
  AlertTriangle, Search, Filter, ArrowUpDown, Bell 
} from 'lucide-preact';
import { supabase } from '../lib/supabase';

export function AppTable({ apps }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortType, setSortType] = useState('newest');
  
  const [user, setUser] = useState(null);
  const [userSubs, setUserSubs] = useState([]);

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

  async function toggleNotification(appName) {
    if (!user) {
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
      {/* Control Bar */}
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

      {/* Main Container */}
      <div className="w-full border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm bg-white dark:bg-zinc-950 overflow-hidden">
        
        {/* Header - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-12 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">
          <div className="col-span-5">Application</div>
          <div className="col-span-3">Latest Version</div>
          <div className="col-span-2">Released</div>
          <div className="col-span-2 text-right">Resources</div>
        </div>

        {/* List Content */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {processedApps.length > 0 ? (
            processedApps.map((app) => {
              const isSubscribed = userSubs.includes(app.name);
              return (
                <div key={app.name} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-0 px-6 py-5 md:py-4 items-center group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  
                  {/* App Name & Subscription */}
                  <div className="col-span-1 md:col-span-5 flex items-center gap-3">
                    <button 
                      onClick={() => toggleNotification(app.name)}
                      className={`p-2 md:p-1.5 rounded-md transition-all ${
                        isSubscribed 
                          ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' 
                          : 'text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-100'
                      }`}
                    >
                      <Bell size={18} className="md:w-4 md:h-4" fill={isSubscribed ? "currentColor" : "none"} />
                    </button>
                    <span className="font-bold text-lg md:text-base text-black dark:text-white leading-tight">
                        {app.name}
                    </span>
                  </div>
                  
                  {/* Version & Badges */}
                  <div className="col-span-1 md:col-span-3 flex flex-wrap items-center gap-2">
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

                  {/* Date */}
                  <div className="col-span-1 md:col-span-2 flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                    <Calendar size={12} className="opacity-50" />
                    {app.released_on}
                  </div>

                  {/* Links */}
                  <div className="col-span-1 md:col-span-2 flex md:justify-end gap-4 md:gap-3 border-t md:border-t-0 border-zinc-100 dark:border-zinc-900 pt-3 md:pt-0">
                    <a title="Website" href={app.metadata?.homepage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 md:block text-zinc-400 hover:text-black dark:hover:text-white transition-colors text-xs md:text-sm">
                      <ExternalLink size={20} className="md:w-6 md:h-6" />
                      <span className="md:hidden font-medium">Homepage</span>
                    </a>
                    <a title="Release notes" href={app.release_notes} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 md:block text-zinc-400 hover:text-black dark:hover:text-white transition-colors text-xs md:text-sm">
                      <ScrollText size={20} className="md:w-6 md:h-6" />
                      <span className="md:hidden font-medium">Release Notes</span>
                    </a>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="px-6 py-16 text-center text-zinc-400 font-mono text-sm">
              No applications matching your criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
}