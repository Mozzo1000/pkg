import { WifiOff, ArrowLeft, Home, Search } from 'lucide-preact';
import { Button } from '../components/Button'; // Assuming you have the Button component we built

export function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 transition-colors">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-mono font-bold tracking-tighter text-black dark:text-white mb-4">
          404
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-10 leading-relaxed">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
      </div>

      {/* Action Grid */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Button 
          href="/" 
          variant="primary" 
          icon={Home} 
          className="w-full"
        >
          Return Home
        </Button>
        <Button 
          href="/apps" 
          variant="secondary" 
          icon={Search} 
          className="w-full"
        >
          Browse Apps
        </Button>
      </div>
    </div>
  );
}