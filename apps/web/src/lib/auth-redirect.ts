/**
 * Where to send people around the sign-in flow.
 * The site is a static export, so there is no server middleware: all of this runs in the browser.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Landing page for a signed-in user. */
export const homeFor = (role?: string | null) => (role === 'ADMIN' ? '/admin' : '/dashboard');

/**
 * Accepts a "go here after sign-in" path only if it is a plain in-app path the user may open.
 * Rejects absolute and protocol-relative URLs (open-redirect), the auth pages themselves (redirect loops),
 * and admin pages for non-admins.
 */
export function safeNext(raw: string | null | undefined, role?: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  if (raw === '/auth' || raw.startsWith('/auth/')) return null;
  if ((raw === '/admin' || raw.startsWith('/admin/')) && role !== 'ADMIN') return null;
  return raw;
}

/** The page the visitor is on now, as an in-app path (the site may be hosted under a base path, which routers omit). */
export function currentAppPath(): string {
  if (typeof window === 'undefined') return '/';
  const { pathname, search } = window.location;
  const path = BASE_PATH && pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) || '/' : pathname;
  return path + search;
}

/** Sign-in URL that returns the visitor to `next` afterwards. */
export function loginUrl(next?: string | null): string {
  // Role is unknown before sign-in, so judge the path as a plain user; admin paths are re-checked after sign-in
  const ok = next && (next === '/admin' || next.startsWith('/admin/') ? next : safeNext(next, 'USER'));
  return ok ? `/auth/login?next=${encodeURIComponent(ok)}` : '/auth/login';
}

/** `?next=` from the current address, if it is safe for this role. */
export function nextFromLocation(role?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  return safeNext(new URLSearchParams(window.location.search).get('next'), role);
}

/** Where to go once signed in: the requested page if allowed, else the role's home. */
export function postLoginTarget(role?: string | null): string {
  return nextFromLocation(role) ?? homeFor(role);
}
