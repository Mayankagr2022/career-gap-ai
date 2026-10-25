import { Brain } from 'lucide-react';

/** Full-screen "one moment" state shown while the app decides where a visitor belongs. */
export function AuthStatusScreen({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[90] flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-brand-400 border-r-violet-400" />
          <Brain className="h-6 w-6 text-brand-200" />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
