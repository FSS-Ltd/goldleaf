# Claude Code: goldleaf

Public site for Goldleaf Tutoring (Goldleaf Learning). Next.js 16, React 19, Tailwind v4, zod, Resend.

## Session start gate
1. `git branch --show-current`. If `main` or `master`, stop and create a named branch (`feat/`, `fix/`, `chore/` and so on). Never prefix with `claude/`.
2. Read `docs/DESIGN.md` (design doc) and `FEATURE_TREE.md` (feature map). Graphify outputs live in `graphify-out/`.
3. Read `AGENTS.md`, including the Next.js block: this Next version differs from older releases, so check `node_modules/next/dist/docs/` before using an API.

## Rules
- Business facts (prices, founding places, trust flags, area) live in `content/site.ts` and `lib/pricing.ts`. Never hardcode them in components.
- Trust claims (DBS, insurance, safeguarding policy) render only when their flag in `content/site.ts` is true. No Ofsted claims.
- UI work goes through the `design-craft` skill. Keep the one signature moment (the stage path). No loaders, WebGL or smooth-scroll libraries.
- Copy: UK English, no em dashes, no exclamation marks, none of the banned words in the user's global CLAUDE.md.
- No AI attribution in commit messages or PRs. Commit format: `type: summary`, then why.

## Commands
`pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm test:unit` · `pnpm test:e2e`

Launch inputs still needed from the client: see `docs/launch-checklist.md`.
