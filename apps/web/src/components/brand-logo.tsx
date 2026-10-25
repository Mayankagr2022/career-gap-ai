import Link from 'next/link';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BrandLogo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-11 w-11 rounded-2xl' : size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-9 w-9 rounded-xl';
  const icon = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]';
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <Link href="/" className={cn('group inline-flex items-center gap-2.5', className)}>
      <span className={cn('relative flex items-center justify-center bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105', box)}>
        <Brain className={cn('text-white', icon)} />
      </span>
      <span className={cn('font-display font-bold tracking-tight', text)}>
        CareerGap <span className="gradient-text">AI</span>
      </span>
    </Link>
  );
}
