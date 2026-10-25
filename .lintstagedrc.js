// Runs on the files staged for commit. ESLint auto-fixes what it can; fixed files are re-staged automatically,
// and any error that cannot be fixed blocks the commit. (Formatting is not enforced here, only lint rules.)
const path = require('path');

// Each package's own ESLint setup is used, so paths are passed relative to that package.
const lintCommand = (pkgDir, pkgName, command) => (files) => {
  const root = path.join(__dirname, pkgDir);
  const rel = files.map((f) => JSON.stringify(path.relative(root, f).split(path.sep).join('/')));
  return command(pkgName, rel);
};

module.exports = {
  // Next.js lint (next/core-web-vitals): takes --file per path
  'apps/web/src/**/*.{ts,tsx}': lintCommand('apps/web', '@career-gap-ai/web', (pkg, rel) =>
    `pnpm --filter ${pkg} exec next lint --fix ${rel.map((f) => `--file ${f}`).join(' ')}`
  ),
  'apps/api/{src,test}/**/*.ts': lintCommand('apps/api', '@career-gap-ai/api', (pkg, rel) =>
    `pnpm --filter ${pkg} exec eslint --fix --max-warnings=-1 ${rel.join(' ')}`
  ),
  'packages/shared/src/**/*.ts': lintCommand('packages/shared', '@career-gap-ai/shared', (pkg, rel) =>
    `pnpm --filter ${pkg} exec eslint --fix --max-warnings=-1 ${rel.join(' ')}`
  ),
};
