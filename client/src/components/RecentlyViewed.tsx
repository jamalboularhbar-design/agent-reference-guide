import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Clock, FileText, X } from 'lucide-react';

interface RecentItem {
  slug: string;
  title: string;
  viewedAt: number;
}

function getRecentlyViewed(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem('arg-recently-viewed') || '[]');
  } catch { return []; }
}

function clearRecentlyViewed() {
  localStorage.removeItem('arg-recently-viewed');
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentlyViewed() {
  const [, navigate] = useLocation();
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-border/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Recently Viewed</h3>
        </div>
        <button
          onClick={() => { clearRecentlyViewed(); setItems([]); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.slice(0, 6).map(item => (
          <button
            key={item.slug}
            onClick={() => navigate(`/docs/${item.slug}`)}
            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card/20 border border-border/30 hover:border-accent/30 transition-colors text-left group"
          >
            <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 group-hover:text-accent transition-colors" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate group-hover:text-accent transition-colors">{item.title}</p>
              <p className="text-[10px] text-muted-foreground">{formatTimeAgo(item.viewedAt)}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
