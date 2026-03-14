import { useState, useEffect } from 'preact/hooks';
import { supabase } from '../lib/supabase';
import { Bell, LogOut, Loader2, Mail, CheckCircle2 } from 'lucide-preact';
import { Button } from '../components/Button';

export function UserSettings() {
  const [apps, setApps] = useState([]);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false); // New state for GitHub
  const [toast, setToast] = useState(null);
  const [subs, setSubs] = useState([]);

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchSubscriptions(session.user.id);
      setLoading(false);
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
    setSubs(data?.map(s => s.app_name) || []);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setToast(null);

    const redirectUrl = `${window.location.origin}/notifications`;
    const { error } = await supabase.auth.signInWithOtp({ 
      email, 
      options: { emailRedirectTo: redirectUrl } 
    });

    setLoginLoading(false);

    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setToast({ message: 'Check your email for the login link!', type: 'success' });
      setEmail('');
      setTimeout(() => setToast(null), 5000);
    }
  }

  async function handleGitHubLogin() {
    setGithubLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/notifications`,
        },
    });

    if (error) {
        setGithubLoading(false); // Only reset on error; otherwise, the page redirects
        setToast({ message: error.message, type: 'error' });
    }
  }

  async function toggleSub(appName) {
    if (subs.includes(appName)) {
      await supabase.from('subscriptions').delete().eq('user_id', user.id).eq('app_name', appName);
      setSubs(subs.filter(s => s !== appName));
    } else {
      await supabase.from('subscriptions').insert({ user_id: user.id, app_name: appName });
      setSubs([...subs, appName]);
    }
  }

  if (loading) return <div className="p-20 text-center font-mono text-zinc-500">Loading profile...</div>;

  if (!user) {
    const isAnyLoading = loginLoading || githubLoading;

    return (
      <div className="max-w-md mx-auto py-20 px-6 relative">
        {toast && (
          <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400' 
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <Mail size={18} />}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        )}

        <h2 className="text-2xl font-bold mb-2">Notifications</h2>
        <p className="text-zinc-500 mb-6 text-sm">Sign in to manage your email alerts.</p>
        
        <div className="space-y-4">
          <button 
            onClick={handleGitHubLogin}
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2 rounded-md font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
          >
            {githubLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <svg size={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-5 h-5">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
                Continue with GitHub
              </>
            )}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-200 dark:border-zinc-800"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-zinc-950 px-2 text-zinc-400 font-mono">Or</span></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" 
              placeholder="your@email.com" 
              required
              className="w-full p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-2 focus:ring-zinc-500/20 disabled:opacity-50"
              value={email}
              onInput={(e) => setEmail(e.currentTarget.value)}
              disabled={isAnyLoading}
            />
            <button 
              disabled={isAnyLoading}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-70 transition-all hover:opacity-90"
            >
              {loginLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send Magic Link'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="flex justify-between items-center mb-10 border-b border-zinc-100 dark:border-zinc-900 pb-6">
        <div>
          <h2 className="text-2xl font-bold">Account Settings</h2>
          <p className="text-zinc-500 text-sm font-mono">{user.email}</p>
        </div>
        <Button variant="secondary" onClick={() => supabase.auth.signOut().then(() => setUser(null))} icon={LogOut}>Sign Out</Button>
      </div>

      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Notification Preferences</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {apps.map(app => (
          <button
            key={app.name}
            onClick={() => toggleSub(app.name)}
            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
              subs.includes(app.name)
              ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900/40'
              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
            }`}
          >
            <div className="text-left">
              <p className="font-bold text-sm">{app.name}</p>
              <p className="text-[10px] text-zinc-500 font-mono">{app.latest_version}</p>
            </div>
            <Bell size={16} className={subs.includes(app.name) ? 'text-zinc-900 dark:text-white' : 'text-zinc-300'} />
          </button>
        ))}
      </div>
    </div>
  );
}