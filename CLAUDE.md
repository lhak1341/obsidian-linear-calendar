# obsidian-linear-calendar

Horizontal year-at-a-glance timeline rendered from note frontmatter. House conventions
(bun, script contract, ESLint, Obsidian API/CSS gotchas) live in the `obsidian-plugin-dev`
skill — only repo-specific facts below.

`main.ts`'s two exported entry points are consumed by `obsidian-lhak-dashboard` at runtime;
signature changes need coordinating both repos. See `src/CLAUDE.md` for that contract and
other src-root-level gotchas (icons, settings, note creation).

`bun run check` = typecheck + lint + test, and is what `deploy`, CI (`ci.yml`, on push/PR)
and the release workflow all run. Lint carries `--max-warnings=0` because most
`obsidianmd`/`typescript-eslint` rules ship at warn severity and eslint exits 0 on warnings.

`bun run test` (vitest) covers `src/utils/`; view/data layers are Obsidian-coupled and
verified manually in `test-vault/`. `obsidian eval` itself needs `vault=lhakZettel` though
— `test-vault` has no CLI bridge plugin.

Agent skills: issue tracker → `docs/agents/issue-tracker.md`; domain docs →
`docs/agents/domain.md`; architecture/AI-readiness reports save to this repo's `temp/`,
not the skill's OS-tmp default.
