import { Github, Rss, Heart } from 'lucide-preact';
import icon from '../assets/icon.svg';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 transition-colors">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center">
                <img src={icon} className="w-8 h-8" alt="VersionSignal Logo" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                PKG
              </span>
            </div>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
              An open-source project providing systematic release signals for enterprise packaging teams. 
              Decoupling update awareness from manual effort through structured data.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-6">
              Resources
            </h4>
            <ul className="space-y-3 text-base">
              <li>
                <a href="/apps" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">App Repository</a>
              </li>
              <li>
                <a href="/docs" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Documentation</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-6">
              Project
            </h4>
            <ul className="space-y-3 text-base">
              <li>
                <a href="https://github.com/mozzo1000/pkg" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <Github size={18} /> GitHub
                </a>
              </li>
              <li>
                <a href="/feed.xml" target="_blank" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <Rss size={18} /> RSS Feed
                </a>
              </li>
              <li>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-500 uppercase tracking-widest">
            © {currentYear} PKG
          </p>
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-500 uppercase tracking-widest">
            Built with <Heart size={12} className="text-red-500 fill-red-500" /> for the packaging community
          </div>
        </div>
      </div>
    </footer>
  );
}