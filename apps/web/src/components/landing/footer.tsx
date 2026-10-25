import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 md:flex-row">
        <BrandLogo size="sm" />
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CareerGap AI. Built for ambitious professionals.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
