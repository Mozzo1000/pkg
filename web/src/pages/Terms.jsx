import {html} from '../terms.md';

export function Terms() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-3xl mx-auto py-20 px-8">
        <article className="prose prose-slate dark:prose-invert max-w-none 
          prose-headings:text-slate-900 dark:prose-headings:text-slate-50
          prose-strong:text-slate-900 dark:prose-strong:text-slate-50">
          
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>

        <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-900">
          <p className="text-sm text-slate-500 font-mono">
            Back to <a href="/" className="text-slate-900 dark:text-slate-50 underline underline-offset-4">Home</a>
          </p>
        </div>
      </div>
    </div>
  );
}