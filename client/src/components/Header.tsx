import { Sparkles, Moon, Sun, Columns, Settings, BookOpen, List, FileText } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

export default function Header() {
  const { theme, toggleTheme, switchable } = useTheme();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  return (
    <header className="border-b border-border/50 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-md sticky top-0 z-50">
      <div className="container flex items-center justify-between py-3 sm:py-5">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-accent via-accent/80 to-accent/60 flex items-center justify-center shadow-lg flex-shrink-0">
            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-2xl font-bold text-foreground truncate">Agent Guide</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground tracking-wide hidden sm:block">Operational Reference System</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Navigation buttons */}
          <button
            onClick={() => navigate('/toc')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border/50 transition-colors active:bg-card/60"
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/lists')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border/50 transition-colors active:bg-card/60"
            title="Reading Lists"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/templates')}
            className="hidden sm:block p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border/50 transition-colors active:bg-card/60"
            title="Document Templates"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/compare')}
            className="hidden sm:block p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border/50 transition-colors active:bg-card/60"
            title="Compare documents"
          >
            <Columns className="w-4 h-4" />
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/editor')}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border/50 transition-colors active:bg-card/60"
              title="Admin editor"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          {switchable && toggleTheme && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border/50 transition-colors active:bg-card/60"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/5 border border-accent/20 ml-1">
            <div className="w-2 h-2 rounded-full bg-accent/60 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Manus & Claude Compatible</span>
          </div>
        </div>
      </div>
    </header>
  );
}
