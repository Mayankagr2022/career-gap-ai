#!/usr/bin/env sh
# Pre-commit build check. Only builds what the staged files can affect, and never disturbs a running dev server:
#   - web:    `next build` compiled into its own folder (.next-check). A static-export build can NOT be used here: it always
#             compiles into .next, which is the folder `next dev` serves from, and overwriting it makes the dev server
#             return 500 errors. CI's pages job still runs the static-export build.
#   - api:    `tsc --noEmit` (same compile check CI runs); no `nest build`, so the dev watcher's dist/ is left alone
#   - shared: built first, because the api and web import its compiled output
set -e

staged=$(git diff --cached --name-only --diff-filter=ACMR)

changed() {
  echo "$staged" | grep -qE "$1"
}

shared=0; api=0; web=0
changed '^packages/shared/' && shared=1
changed '^apps/api/' && api=1
changed '^apps/web/' && web=1

if [ "$shared$api$web" = "000" ]; then
  echo "pre-commit: no app or package files staged, skipping build checks"
  exit 0
fi

if [ "$shared" = "1" ]; then
  echo "pre-commit: building packages/shared"
  pnpm --filter @career-gap-ai/shared build
fi

if [ "$api" = "1" ] || [ "$shared" = "1" ]; then
  echo "pre-commit: type-checking the API"
  pnpm --filter @career-gap-ai/api exec tsc --noEmit -p tsconfig.json
fi

if [ "$web" = "1" ] || [ "$shared" = "1" ]; then
  echo "pre-commit: building the web app (into .next-check)"
  NEXT_DIST_DIR=.next-check pnpm --filter @career-gap-ai/web exec next build
fi

echo "pre-commit: all checks passed"
