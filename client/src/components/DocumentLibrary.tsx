import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import {
  FileText, Search, Filter, ChevronDown, ChevronUp,
  Server, Users, DollarSign, ShieldCheck, BarChart3,
  Megaphone, Package, Heart, Scale, Handshake, Database,
  Settings, Bot, Briefcase
} from 'lucide-react';
import DocumentLibrarySkeleton from './DocumentLibrarySkeleton';
import BulkExport from './BulkExport';

const CATEGORY_ICONS: Record<string, any> = {
  'Engineering': Server,
  'Customer Success': Users,
  'Sales': DollarSign,
  'Marketing': Megaphone,
  'Product': Package,
  'People & Culture': Heart,
  'Finance & Legal': Scale,
  'Security & Compliance': ShieldCheck,
  'Revenue & Pricing': BarChart3,
  'Partnerships & GTM': Handshake,
  'Data & Analytics': Database,
  'Operations': Settings,
  'AI & Developer': Bot,
  'Strategy & Operations': Briefcase,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Engineering': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Customer Success': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Sales': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Marketing': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Product': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'People & Culture': 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'Finance & Legal': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Security & Compliance': 'bg-red-500/15 text-red-400 border-red-500/30',
  'Revenue & Pricing': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'Partnerships & GTM': 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'Data & Analytics': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'Operations': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  'AI & Developer': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'Strategy & Operations': 'bg-stone-500/15 text-stone-400 border-stone-500/30',
};

const ITEMS_PER_PAGE = 24;

// Highlight matching text in search results
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-accent/30 text-accent rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function DocumentLibrary() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch categories from database
  const { data: categoriesData, isLoading: categoriesLoading } = trpc.documents.categories.useQuery();

  // Fetch documents from database - fetch all for category view, paginate for filtered
  const { data: documentsData, isLoading: documentsLoading, error: documentsError } = trpc.documents.list.useQuery({
    category: selectedCategory !== 'All' ? selectedCategory : undefined,
    search: debouncedSearch.trim() || undefined,
    limit: 600,
    offset: 0,
  });

  const categories = categoriesData ?? [];
  const totalDocuments = categories.reduce((sum, c) => sum + c.count, 0);
  const categoryList = categories.map(c => c.category);
  const categoryCounts: Record<string, number> = {};
  categories.forEach(c => { categoryCounts[c.category] = c.count; });

  const documents = documentsData?.documents ?? [];
  const filteredTotal = documentsData?.total ?? 0;

  // Grouped by category for category view
  const groupedDocs = useMemo(() => {
    const groups: Record<string, typeof documents> = {};
    documents.forEach(doc => {
      if (!groups[doc.category]) groups[doc.category] = [];
      groups[doc.category].push(doc);
    });
    return groups;
  }, [documents]);

  const visibleDocs = documents.slice(0, visibleCount);
  const hasMore = visibleCount < documents.length;

  const isLoading = categoriesLoading || documentsLoading;

  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <section className="mt-24 pt-12 border-t border-border/50">
      {/* Section Header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="inline-block mb-3 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
            <p className="text-xs font-semibold text-accent tracking-wider uppercase">Complete Library</p>
          </div>
          <h2 className="font-display text-4xl md:text-5xl mb-2 text-foreground">Document Library</h2>
          <p className="text-muted-foreground">
            <span className="text-accent font-semibold">{totalDocuments}</span> comprehensive operational documents across{' '}
            <span className="text-accent font-semibold">{categoryList.length}</span> categories
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search titles and content across all documents..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-card border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSelectedCategory('All'); setVisibleCount(ITEMS_PER_PAGE); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              selectedCategory === 'All'
                ? 'bg-accent/20 text-accent border-accent/40'
                : 'bg-card/50 text-muted-foreground border-border/50 hover:border-accent/30'
            }`}
          >
            All ({totalDocuments})
          </button>
          {Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => {
              const Icon = CATEGORY_ICONS[cat] || FileText;
              return (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat === selectedCategory ? 'All' : cat); setVisibleCount(ITEMS_PER_PAGE); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-accent/20 text-accent border-accent/40'
                      : 'bg-card/50 text-muted-foreground border-border/50 hover:border-accent/30'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {cat} ({count})
                </button>
              );
            })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <DocumentLibrarySkeleton />}

      {/* Error State */}
      {documentsError && !isLoading && (
        <div className="text-center py-16">
          <Filter className="w-12 h-12 text-red-400/30 mx-auto mb-4" />
          <p className="text-red-400">Failed to load documents. Please try again.</p>
        </div>
      )}

      {/* Results Count */}
      {!isLoading && searchQuery && (
        <p className="text-sm text-muted-foreground mb-6">
          Found <span className="text-accent font-semibold">{filteredTotal}</span> document{filteredTotal !== 1 ? 's' : ''} matching "{searchQuery}"
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
        </p>
      )}

      {/* Category View (when no search and All selected) */}
      {!isLoading && !searchQuery && selectedCategory === 'All' ? (
        <div className="space-y-4">
          {Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => {
              const Icon = CATEGORY_ICONS[cat] || FileText;
              const isExpanded = expandedCategories.has(cat);
              const catDocs = groupedDocs[cat] || [];
              const colorClass = CATEGORY_COLORS[cat] || 'bg-muted/30 text-muted-foreground border-border/50';
              
              return (
                <div key={cat} className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                  <button
                    onClick={() => toggleCategoryExpand(cat)}
                    className="w-full flex items-center justify-between p-4 hover:bg-card/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClass.split(' ')[0]}`}>
                        <Icon className={`w-4.5 h-4.5 ${colorClass.split(' ')[1]}`} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground text-sm">{cat}</h3>
                        <p className="text-xs text-muted-foreground">{count} document{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BulkExport category={cat} />
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-border/30 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catDocs.map(doc => (
                          <button
                            key={doc.slug}
                            onClick={() => navigate(`/docs/${doc.slug}`)}
                            className="p-3 rounded-lg bg-background/50 border border-border/30 hover:border-accent/30 transition-colors group text-left w-full"
                          >
                            <div className="flex items-start gap-2.5">
                              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 group-hover:text-accent transition-colors" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">{doc.title}</p>
                                {doc.wordCount && (
                                  <p className="text-[10px] text-muted-foreground mt-1">{Math.ceil((doc.wordCount || 0) / 200)} min read</p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : !isLoading ? (
        /* List View (when searching or category selected) */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleDocs.map(doc => {
              const colorClass = CATEGORY_COLORS[doc.category] || 'bg-muted/30 text-muted-foreground border-border/50';
              return (
                <button
                  key={doc.slug}
                  onClick={() => navigate(`/docs/${doc.slug}`)}
                  className="p-4 rounded-xl bg-card/30 border border-border/50 hover:border-accent/30 transition-all group text-left"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0 group-hover:text-accent transition-colors" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                        <HighlightText text={doc.title} query={debouncedSearch} />
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${colorClass}`}>
                          {doc.category}
                        </Badge>
                        {doc.wordCount && (
                          <span className="text-[10px] text-muted-foreground">{Math.ceil((doc.wordCount || 0) / 200)} min read</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                className="px-6 py-2.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
              >
                Load More ({documents.length - visibleCount} remaining)
              </button>
            </div>
          )}
          
          {documents.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <Filter className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No documents found matching your criteria.</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-3 text-accent text-sm hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
