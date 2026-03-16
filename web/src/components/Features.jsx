import { Layers, Activity, Bell } from 'lucide-preact';

export function Features() {
  const features = [
    {
      title: "250+ Applications tracked",
      description: "A comprehensive library of enterprise software metadata, from developer tools to core productivity suites.",
      icon: Layers
    },
    {
      title: "Real-time Version detection",
      description: "Automated polling and event detection ensures that as soon as a vendor publishes, the signal is live.",
      icon: Activity
    },
    {
      title: "Alerts & RSS Feeds",
      description: "Get email notifications for your favorite apps or use our global RSS stream to trigger internal workflows.",
      icon: Bell
    }
  ];

  return (
    <section className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-0 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/20 p-8 space-y-4 bg-white dark:bg-slate-950 transition-colors ${
                index !== features.length - 1 ? 'border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800' : ''
              }`}>
              <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                <feature.icon size={22} />
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {feature.title}
              </h3>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}