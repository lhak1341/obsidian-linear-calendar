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

## @lhak/style

The look comes from `@lhak/style`, vendored at `vendor/lhak-style/` (committed, so a clone and the
release workflow build with no token). To update it, run `node scripts/vendor.mjs <this repo>` from
lhak-style-guide, then `bun install` here. `styles.css` is generated from `styles.src.css` by the
build (second esbuild entry, `scripts/styles.mjs`) and gitignored; edit the source. `lint` runs
stylelint on it (the package's adoption check), and `src/styles.test.ts` pins the built sheet.
The full view's `contentEl` carries `lk-root`; a rolling strip reads its host's root and gets
the `lc-embedded` class, which keys the strip layout (it used to live in the dashboard). The
settings tab and modals sit outside every root, so their rules keep Obsidian's variables.

Agent skills: issue tracker → `docs/agents/issue-tracker.md`; domain docs →
`docs/agents/domain.md`; architecture/AI-readiness reports save to this repo's `temp/`,
not the skill's OS-tmp default.
