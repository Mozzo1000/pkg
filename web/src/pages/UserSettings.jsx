import { useState, useEffect } from 'preact/hooks';
import { supabase } from '../lib/supabase';
import { Bell, LogOut, Loader2, Mail, CheckCircle2, Github, Info, ChevronDown, ChevronUp } from 'lucide-preact';
import { Button } from '../components/Button';
import { useToast } from '../ToastContext';

export function UserSettings() {
  const [apps, setApps] = useState([]);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [subs, setSubs] = useState([]);
  const [showInfo, setShowInfo] = useState(false); // Toggle for info box
  const showToast = useToast();

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
    if (!supabase) return;
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
        options: { redirectTo: `${window.location.origin}/notifications` },
    });

    if (error) {
        setGithubLoading(false);
        setToast({ message: error.message, type: 'error' });
    }
  }


  async function toggleSub(appName) {
    try {
      if (subs.includes(appName)) {
        const { error } = await supabase
          .from('subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('app_name', appName);

        if (error) throw error;

        setSubs(subs.filter(s => s !== appName));
        
        showToast({
          title: "Subscription removed",
          message: `You have successfully unsubscribed from ${appName} notifications.`,
          type: "info"
        });

      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({ user_id: user.id, app_name: appName });

        if (error) throw error;

        setSubs([...subs, appName]);

        showToast({
          title: "Subscription added",
          message: `You will receive an email notification when a new version of ${appName} is released.`,
          type: "success"
        });
      }
    } catch (err) {
      console.error("Subscription Error:", err);
      
      // Error Toast for Failures
      showToast({
        title: "Update failed",
        message: "We couldn't update your preferences. Please try again later.",
        type: "error"
      });
    }
  }

  if (loading) return <div className="p-20 text-center font-mono text-slate-500 text-lg">Loading profile...</div>;
  
  if (!user) {
    const isAnyLoading = loginLoading || githubLoading;

    return (
      <div className="max-w-md mx-auto py-24 px-6 relative">
        {toast && (
          <div className={`mb-8 p-5 rounded-xl border flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400' 
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={22} /> : <Mail size={22} />}
            <p className="text-base font-medium">{toast.message}</p>
          </div>
        )}

        <h2 className="text-3xl font-bold mb-3 tracking-tight text-slate-900 dark:text-slate-50">Notifications</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-base">Sign in to manage your email alerts.</p>
        
        <div className="space-y-5">

          <Button className="w-full! " onClick={handleGitHubLogin} disabled={isAnyLoading} variant="secondary">
            {githubLoading ? <Loader2 size={20} className="animate-spin" /> : <><Github size={20}/> Continue with GitHub</>}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-slate-800"></span></div>
            <div className="relative flex justify-center text-sm uppercase"><span className="bg-white dark:bg-slate-950 px-3 text-slate-400 font-mono">Or</span></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" 
              placeholder="your@email.com" 
              required
              className="w-full p-3 text-base bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500/20 disabled:opacity-50"
              value={email}
              onInput={(e) => setEmail(e.currentTarget.value)}
              disabled={isAnyLoading}
            />
            <Button variant="primary" className="w-full!" disabled={isAnyLoading}>
                {loginLoading ? <Loader2 size={20} className="animate-spin" /> : 'Send Magic Link'} 
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-16 px-6 ">
      <div className="flex justify-between items-center mb-12 border-b border-slate-100 dark:border-slate-900 pb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Account Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 text-base font-mono mt-1">{user.email}</p>
        </div>
        <Button variant="secondary" onClick={() => supabase.auth.signOut().then(() => setUser(null))} icon={LogOut}>Sign Out</Button>
      </div>

      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-base font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Notification Preferences</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Updates sent to {user.email}</p>
        </div>
        
        <Button variant="ghost" onClick={() => setShowInfo(!showInfo)}>
          <Info size={18} />
          {showInfo ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </Button>
      </div>

      {showInfo && (
        <div className="mb-10 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 animate-in slide-in-from-top-2 duration-300">
          <h4 className="text-base font-bold mb-2 flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <CheckCircle2 size={18} className="text-emerald-500" />
            Email notification
          </h4>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            When we detected a new version, we'll send an email from 
            <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-[13px]">
              notifications@pkg.rewake.org
            </code> 
            so you never miss an update.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apps.map(app => (
          <button
            key={app.name}
            onClick={() => toggleSub(app.name)}
            className={`flex items-center justify-between p-6 rounded-xl border transition-all ${
              subs.includes(app.name)
              ? 'border-slate-900 dark:border-slate-50 bg-slate-50 dark:bg-slate-900/40 shadow-sm'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 group'
            }`}
          >
            <div className="text-left text-slate-900 dark:text-slate-50">
              <p className="font-bold text-lg">{app.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 opacity-70">{app.latest_version}</p>
            </div>
            <Bell 
              size={20} 
              className={subs.includes(app.name) ? 'text-slate-900 dark:text-slate-50' : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors'} 
            />
          </button>
        ))}
      </div>
    </div>
  );
}