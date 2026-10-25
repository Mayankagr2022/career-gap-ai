/**
 * Token mode: the web app is served from a different address than the API (for example GitHub Pages), and browsers will not
 * send the API's cookies there. The API then returns its tokens in the response, and they are kept here and sent as a
 * Bearer header. The access token is short-lived and tied to a session, and the refresh token rotates on every use.
 * Anything that can run script on the page can read them, so this trades some protection for working across addresses.
 *
 * Cookie mode (the default) keeps tokens in HttpOnly cookies that the page cannot read.
 */
export const TOKEN_MODE = process.env.NEXT_PUBLIC_AUTH_MODE === 'token';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

const KEY = 'cg-tokens';

export function getTokens(): StoredTokens | null {
  if (!TOKEN_MODE || typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    return parsed?.accessToken && parsed?.refreshToken ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken } : null;
  } catch {
    return null;
  }
}

export function setTokens(tokens: StoredTokens) {
  if (!TOKEN_MODE || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
  } catch {
    /* storage blocked: the session lasts until the page is closed only if the browser allows storage */
  }
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
