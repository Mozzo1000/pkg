import { useEffect } from 'preact/hooks';
import { 
  CheckCircle2, AlertCircle, Info, 
  AlertTriangle, X 
} from 'lucide-preact';

export function Toast({ message, title, isVisible, onClose, duration = 4000, type = 'success' }) {
  
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  if (!isVisible) return null;

  const themes = {
    success: {
      icon: CheckCircle2,
      color: "text-emerald-500",
      border: "border-l-emerald-500",
      defaultTitle: "Success"
    },
    error: {
      icon: AlertCircle,
      color: "text-red-500",
      border: "border-l-red-500",
      defaultTitle: "Error"
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-500",
      border: "border-l-amber-500",
      defaultTitle: "Warning"
    },
    info: {
      icon: Info,
      color: "text-slate-500 dark:text-slate-400",
      border: "border-l-slate-400 dark:border-l-slate-600",
      defaultTitle: "Information"
    }
  };

  const theme = themes[type] || themes.success;
  const Icon = theme.icon;

  return (
    <div className="z-100 animate-in slide-in-from-right-full fade-in duration-300">
      <div className={`relative flex items-start gap-5 px-6 py-5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-[6px] ${theme.border} shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-150 max-h-25`}>
        
        <div className={`shrink-0 mt-0.5 ${theme.color}`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>

        <div className="flex-1 pr-6">
          <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-50 leading-none">
            {title || theme.defaultTitle}
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        <button 
          onClick={onClose}
          className="shrink-0 -mt-1 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}