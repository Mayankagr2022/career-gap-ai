'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

// Analyses used to live at /dashboard/analyses/<id>. The detail page is now /dashboard/analyses/view?id=<id> (a statically
// hosted site cannot have a page per id), so an old address that reaches this page is forwarded to the new one.
const OLD_ANALYSIS_PATH = /^\/dashboard\/analyses\/([0-9a-f-]{36})\/?$/i;

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const oldId = OLD_ANALYSIS_PATH.exec(pathname ?? '')?.[1];

  useEffect(() => {
    if (oldId) router.replace(`/dashboard/analyses/view?id=${oldId}`);
  }, [oldId, router]);

  if (oldId) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl font-bold">Page not found</h1>
      <p className="max-w-md text-muted-foreground">The page you are looking for does not exist or has moved.</p>
      <Link href="/" className="btn-primary px-6 py-2.5 text-sm">
        Go to the home page
      </Link>
    </div>
  );
}
