import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft, FileText, Clock, BookOpen, Copy, Download,
  Bookmark, BookmarkCheck, Printer, ChevronRight, Loader2,
  Hash, AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Reading time calculation
function getReadingTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 200);
  return `${minutes} min read`;
}

// Extract headings for table of contents
function extractHeadings(content: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      headings.push({ id, text, level });
    }
  }
  return headings;
}

// Favorites management via localStorage
function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem('arg-favorites') || '[]');
  } catch { return []; }
}

function toggleFavorite(slug: string): boolean {
  const favorites = getFavorites();
  const index = favorites.indexOf(slug);
  if (index >= 0) {
    favorites.splice(index, 1);
    localStorage.setItem('arg-favorites', JSON.stringify(favorites));
    return false;
  } else {
    favorites.unshift(slug);
    localStorage.setItem('arg-favorites', JSON.stringify(favorites));
    return true;
  }
}

// Recently viewed tracking
function addToRecentlyViewed(slug: string, title: string) {
  try {
    const recent = JSON.parse(localStorage.getItem('arg-recently-viewed') || '[]');
    const filtered = recent.filter((r: any) => r.slug !== slug);
    filtered.unshift({ slug, title, viewedAt: Date.now() });
    localStorage.setItem('arg-recently-viewed', JSON.stringify(filtered.slice(0, 20)));
  } catch { /* ignore */ }
}

export default function DocumentDetail() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const slug = params.slug || '';
  
  const { data: document, isLoading, error } = trpc.documents.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const [isFavorited, setIsFavorited] = useState(false);
  const [activeHeading, setActiveHeading] = useState('');

  // Track recently viewed
  useEffect(() => {
    if (document) {
      addToRecentlyViewed(document.slug, document.title);
      setIsFavorited(getFavorites().includes(document.slug));
    }
  }, [document]);

  // Table of contents
  const headings = useMemo(() => {
    if (!document?.content) return [];
    return extractHeadings(document.content);
  }, [document?.content]);

  // Scroll spy for TOC
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    const headingElements = window.document.querySelectorAll('h1[id], h2[id], h3[id]');
    headingElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [document]);

  // Copy markdown to clipboard
  const handleCopy = useCallback(async () => {
    if (!document?.content) return;
    try {
      await navigator.clipboard.writeText(document.content);
      toast.success('Markdown copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [document]);

  // Download as .md file
  const handleDownload = useCallback(() => {
    if (!document) return;
    const blob = new Blob([document.content || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download started');
  }, [document]);

  // Toggle favorite
  const handleToggleFavorite = useCallback(() => {
    if (!document) return;
    const nowFavorited = toggleFavorite(document.slug);
    setIsFavorited(nowFavorited);
    toast.success(nowFavorited ? 'Added to favorites' : 'Removed from favorites');
  }, [document]);

  // Print-friendly view
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <span className="text-muted-foreground">Loading document...</span>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Document Not Found</h2>
          <p className="text-muted-foreground mb-6">The document you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Library</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                isFavorited 
                  ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/80'
              }`}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorited ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors"
              title="Copy markdown"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors"
              title="Download .md file"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors"
              title="Print document"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Table of Contents Sidebar */}
          {headings.length > 3 && (
            <aside className="hidden xl:block w-64 flex-shrink-0">
              <div className="sticky top-20">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Table of Contents
                </h4>
                <nav className="space-y-1 max-h-[calc(100vh-120px)] overflow-y-auto pr-2">
                  {headings.map((heading, i) => (
                    <a
                      key={i}
                      href={`#${heading.id}`}
                      className={`block text-xs py-1 transition-colors border-l-2 ${
                        heading.level === 1 ? 'pl-3' : heading.level === 2 ? 'pl-5' : 'pl-7'
                      } ${
                        activeHeading === heading.id
                          ? 'text-accent border-accent'
                          : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border'
                      }`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Document Header */}
            <div className="mb-8 pb-6 border-b border-border/50">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <button onClick={() => navigate('/')} className="hover:text-accent transition-colors">Library</button>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground">{document.category}</span>
              </div>

              <h1 className="font-display text-3xl md:text-4xl text-foreground mb-4">{document.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {document.category}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{getReadingTime(document.wordCount || 0)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{(document.wordCount || 0).toLocaleString()} words</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{document.filename}</span>
                </div>
              </div>
            </div>

            {/* Markdown Content */}
            <article className="prose prose-invert prose-sm max-w-none
              prose-headings:font-display prose-headings:text-foreground
              prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4
              prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-2
              prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-li:text-muted-foreground
              prose-strong:text-foreground
              prose-a:text-accent prose-a:no-underline hover:prose-a:underline
              prose-code:text-accent prose-code:bg-accent/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
              prose-pre:bg-card prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl
              prose-table:border prose-table:border-border/50
              prose-th:bg-card/50 prose-th:border prose-th:border-border/50 prose-th:px-3 prose-th:py-2 prose-th:text-foreground
              prose-td:border prose-td:border-border/50 prose-td:px-3 prose-td:py-2
              prose-blockquote:border-accent/50 prose-blockquote:text-muted-foreground
              prose-hr:border-border/50
              print:prose-p:text-black print:prose-headings:text-black
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children, ...props }) => {
                    const text = String(children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    return <h1 id={id} {...props}>{children}</h1>;
                  },
                  h2: ({ children, ...props }) => {
                    const text = String(children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    return <h2 id={id} {...props}>{children}</h2>;
                  },
                  h3: ({ children, ...props }) => {
                    const text = String(children);
                    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    return <h3 id={id} {...props}>{children}</h3>;
                  },
                }}
              >
                {document.content}
              </ReactMarkdown>
            </article>

            {/* Bottom Navigation */}
            <div className="mt-12 pt-6 border-t border-border/50 flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Library
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-card/50 border border-border/50 hover:border-accent/30 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-card/50 border border-border/50 hover:border-accent/30 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
