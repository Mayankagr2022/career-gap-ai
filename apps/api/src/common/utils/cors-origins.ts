/**
 * Origins allowed to call the API from a browser. FRONTEND_URL may include a path (for example
 * https://owner.github.io/repo when the web app is served from GitHub Pages), but a browser's Origin header never does,
 * so only the origin part is used.
 */
export function corsOrigins(frontendUrl: string | undefined): string[] {
  const origins = new Set<string>(['http://localhost:3000']);
  try {
    if (frontendUrl) origins.add(new URL(frontendUrl).origin);
  } catch {
    // an invalid FRONTEND_URL leaves only the local development origin
  }
  return [...origins];
}
