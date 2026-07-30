'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/5", className)}>
        <span className="h-4 w-4" />
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors overflow-hidden",
        className
      )}
      aria-label="Toggle theme"
    >
      <div className="relative h-4 w-4">
        <Sun 
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-300",
            theme === 'dark' ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
          )} 
        />
        <Moon 
          className={cn(
            "absolute inset-0 h-4 w-4 transition-all duration-300",
            theme === 'dark' ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
          )} 
        />
      </div>
    </button>
  );
}
