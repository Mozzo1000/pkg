import { ExternalLink, ScrollText } from 'lucide-preact';

export function AppTable({ apps }) {
  return (
    <div className="w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
            <th className="px-6 py-4 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">Application</th>
            <th className="px-6 py-4 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500">Latest Version</th>
            <th className="px-6 py-4 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500 text-right">Resources</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {apps.map((app) => (
            <tr 
              key={app.name} 
              className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
            >
              {/* App Name */}
              <td className="px-6 py-4">
                <span className="font-bold text-black dark:text-white">
                  {app.name}
                </span>
              </td>

              {/* Version Badge */}
              <td className="px-6 py-4">
                <code className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono border border-zinc-200 dark:border-zinc-700">
                  {app.current_version}
                </code>
              </td>

              {/* Action Links */}
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-3">
                  <a 
                    href={app.metadata.homepage} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                    title="Homepage"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <a 
                    href={app.metadata.release_notes} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                    title="Release Notes"
                  >
                    <ScrollText size={16} />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}