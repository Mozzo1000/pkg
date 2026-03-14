import { Layers, Activity, Rss } from 'lucide-preact';

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
      title: "RSS Feed available",
      description: "Subscribe to the global stream or specific application categories to trigger your internal workflows.",
      icon: Rss
    }
  ];

  return (
    <section className="bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-0 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`p-8 space-y-4 bg-white dark:bg-zinc-950 transition-colors ${
                index !== features.length - 1 ? 'border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800' : ''
              }`}
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                <feature.icon size={22} />
              </div>
              
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {feature.title}
              </h3>
              
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}