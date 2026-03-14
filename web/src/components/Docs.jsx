import { useState, useMemo } from 'preact/hooks';
import { Menu, X, ChevronLeft, ChevronDown, Folder, FileText, BookOpen } from 'lucide-preact';

// Automatically find all .md files, including subfolders
const docFiles = import.meta.glob('../docs/**/*.md', { eager: true });

export function Docs() {
  // CONFIG: Change this to the slug of the page you want to load first
  const DEFAULT_SLUG = 'about'; 

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  // 1. Transform files into Root Items and Folder Groups
  const { rootItems, folderGroups, firstSlug } = useMemo(() => {
    const root = [];
    const groups = {};
    let fallbackSlug = null;
    let preferredSlug = null;

    // Sort paths alphabetically to ensure consistent order
    const sortedPaths = Object.keys(docFiles).sort();

    sortedPaths.forEach((path) => {
      const module = docFiles[path];
      const parts = path.split('/');
      const fileName = parts.pop().replace('.md', '');
      
      const parentFolder = parts[parts.length - 1];
      const isRoot = parentFolder === 'docs';

      const slug = isRoot ? fileName : `${parentFolder}-${fileName}`.toLowerCase();
      const title = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      
      // Track the first possible slug in case the default isn't found
      if (!fallbackSlug) fallbackSlug = slug;
      // If we find the slug we actually want, mark it
      if (slug === DEFAULT_SLUG) preferredSlug = slug;

      const pageData = { slug, title, html: module.html };

      if (isRoot) {
        root.push(pageData);
      } else {
        const groupTitle = parentFolder.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!groups[groupTitle]) groups[groupTitle] = [];
        groups[groupTitle].push(pageData);
      }
    });

    return { 
      rootItems: root, 
      folderGroups: groups, 
      firstSlug: preferredSlug || fallbackSlug 
    };
  }, [DEFAULT_SLUG]);

  // Set initial active page state using the calculated firstSlug
  const [activeSlug, setActiveSlug] = useState(firstSlug);

  const allPages = [...rootItems, ...Object.values(folderGroups).flat()];
  const activePage = allPages.find(p => p.slug === activeSlug);

  const toggleSection = (name) => {
    setExpandedSections(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 overflow-hidden relative">
      
      {/* Mobile Nav Toggle */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-6 z-40">
        <button onClick={() => setIsMobileMenuOpen(true)} className="text-zinc-900 dark:text-white"><Menu size={24} /></button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 
        bg-white dark:bg-zinc-950  {/* Changed to solid background */}
        border-r border-zinc-200 dark:border-zinc-800 
        transition-transform duration-300 md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400">Documentation</h2>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-zinc-500"><X size={20} /></button>
          </div>

          <nav className="space-y-6">
            {/* 1. Root Level Items */}
            <div className="space-y-1">
              {rootItems.map(page => (
                <button
                  key={page.slug}
                  onClick={() => { setActiveSlug(page.slug); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all ${
                    activeSlug === page.slug 
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-medium shadow-sm' 
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900'
                  }`}
                >
                  <FileText size={14} className="opacity-50" />
                  {page.title}
                </button>
              ))}
            </div>

            {/* 2. Folder Groups */}
            {Object.entries(folderGroups).map(([section, pages]) => (
              <div key={section} className="space-y-2">
                <button 
                  onClick={() => toggleSection(section)}
                  className="w-full flex items-center justify-between px-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                >
                  <span className="flex items-center gap-2"><Folder size={12}/> {section}</span>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${expandedSections[section] ? 'rotate-180' : ''}`} />
                </button>
                
                {!expandedSections[section] && (
                  <div className="space-y-1 ml-2 border-l border-zinc-200 dark:border-zinc-800">
                    {pages.map(page => (
                      <button
                        key={page.slug}
                        onClick={() => { setActiveSlug(page.slug); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 pl-4 pr-3 py-1.5 text-sm transition-colors ${
                          activeSlug === page.slug 
                            ? 'text-black dark:text-white font-medium border-l-2 border-black dark:border-white -ml-[1px]' 
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                        }`}
                      >
                        {page.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-5xl mx-auto py-12 md:py-20 px-8 md:px-16">
          {activePage ? (
            <>
              <div className="flex items-center gap-2 text-zinc-400 font-mono text-[10px] uppercase tracking-widest mb-4">
                <BookOpen size={12} />
                <span>{activePage.slug}.md</span>
              </div>
              <h1 className="text-4xl font-bold text-black dark:text-white mb-8 tracking-tight">{activePage.title}</h1>
              <article className="prose prose-zinc dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: activePage.html }} />
              </article>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400 font-mono text-sm">
              Select a page to begin.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}