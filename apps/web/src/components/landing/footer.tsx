import Link from 'next/link';
import { Brain } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-foreground/[0.05] py-12 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500">
              <Brain className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-display font-bold gradient-text">CareerGap AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 CareerGap AI. Built with ❤️ for ambitious professionals.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
