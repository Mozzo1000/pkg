import { Rss, Database, Workflow, BellOff, ArrowRight } from 'lucide-preact';

import { Button } from './Button';
import { LiveSignalFeed } from './LiveSignalFeed';

export function Hero() {
  return (
    <section className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 transition-colors">
      <div className="container mx-auto px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-5 gap-16 items-start">
          
          {/* Main Content Area */}
          <div className="lg:col-span-3">
      

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl mb-6">
              Unified version tracking for software packages
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-2xl leading-relaxed">
              Stop relying on individuals to track software updates. We automatically detects new versions and notifies the right teams. Transforming scattered knowledge into systematic, event-driven workflows.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button href="/apps" variant="primary" icon={Database}>
                    Browse applications
                </Button>
                
                <Button href="/feed.xml" variant="secondary" icon={Rss}>
                    Subscribe to RSS Feed
                </Button>
            </div>
          </div>

          {/* Live Signal Feed Component (Right 2/5) */}
          <div className="lg:col-span-2 mt-12 lg:mt-0">
            <LiveSignalFeed />
          </div>

        </div>
      </div>
    </section>
  );
}