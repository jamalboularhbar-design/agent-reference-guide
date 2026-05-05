import { Sparkles, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function Header() {
  const { theme, toggleTheme, switchable } = useTheme();

  return (
    <header className="border-b border-border/50 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-md sticky top-0 z-50">
      <div className="container flex items-center justify-between py-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-accent via-accent/80 to-accent/60 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Agent Guide</h1>
            <p className="text-xs text-muted-foreground tracking-wide">Operational Reference System</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {switchable && toggleTheme && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border/50 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/5 border border-accent/20">
            <div className="w-2 h-2 rounded-full bg-accent/60 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Manus & Claude Compatible</span>
          </div>
        </div>
      </div>
    </header>
  );
}
