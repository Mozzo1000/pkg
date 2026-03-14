import { User, Mail, Eye, ArrowRight, Zap, Bell, Users } from "lucide-preact"

export function ProblemSolution() {
  const journey = [
    {
      problem: {
        title: "Knowledge lives with one person",
        desc: "License owners become single points of failure. When they leave or are unavailable, version awareness disappears.",
        icon: User
      },
      solution: {
        title: "Systems detect new versions",
        desc: "Automated crawlers and API integrations continuously monitor for new releases across all tracked applications.",
        icon: Zap
      }
    },
    {
      problem: {
        title: "Information arrives manually",
        desc: "Updates come through vendor emails, newsletters, or random discoveries. Inconsistent and unreliable.",
        icon: Mail
      },
      solution: {
        title: "Rules decide who should care",
        desc: "Configure notification rules based on application category, security criticality, or team ownership.",
        icon: Bell
      }
    },
    {
      problem: {
        title: "Notification depends on interest",
        desc: "Some people care, some don't. Critical security updates can slip through when they shouldn't.",
        icon: Eye
      },
      solution: {
        title: "Everyone gets the same visibility",
        desc: "Notifications via RSS, or email ensure consistent awareness across all stakeholders.",
        icon: Users
      }
    }
  ];

  return (
    <section className="bg-white dark:bg-slate-950 py-20 border-b border-slate-100 dark:border-slate-900">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            The problem with manual version tracking
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Enterprise packaging teams face the same manual friction.
          </p>
        </div>

        <div className="space-y-4">
          {/* Header Row */}
          <div className="hidden md:grid grid-cols-2 gap-8 px-8 mb-4">
            <span className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-zinc-400">Current State</span>
            <span className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">With PKG</span>
          </div>

          {journey.map((item, index) => (
            <div key={index} className="grid md:grid-cols-2 gap-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              {/* Problem Side */}
              <div className="p-8 bg-slate-50/50 dark:bg-slate-900/20 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <item.problem.icon size={20} className="text-slate-400 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">{item.problem.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.problem.desc}</p>
                  </div>
                </div>
              </div>

              {/* Solution Side */}
              <div className="p-8 bg-white dark:bg-slate-950">
                <div className="flex items-start gap-4">
                  <item.solution.icon size={20} className="dark:text-white text-zinc-900 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">{item.solution.title}</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.solution.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}