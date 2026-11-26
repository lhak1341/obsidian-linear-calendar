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
verified manually in `test-vault/`. `obsidian eval` itself needs `vault=lhakZettel`, placed before the subcommand (`obsidian vault=lhakZettel eval …`), though
— `test-vault` has no CLI bridge plugin.

## @lhak/style

The look comes from `@lhak/style`, vendored at `vendor/lhak-style/` (committed, so a clone and the
release workflow build with no token). To update it, run `node scripts/vendor.mjs <this repo>` from
lhak-style-guide, then `bun install` here. `styles.css` is generated from `styles.src.css` by the
build (second esbuild entry, `scripts/styles.mjs`) and gitignored; edit the source. `lint` runs
stylelint on it (the package's adoption check), and `src/styles.test.ts` pins the built sheet.
The full view's `contentEl` carries `lk-root`; a rolling strip reads its host's root and gets
the `lc-embedded` class, which keys the strip layout (it used to live in the dashboard). The
settings tab and modals sit outside every root, so their rules keep Obsidian's variables; the one
exception is the settings tag chips and their editor popover, which carry `lk-root` themselves to read the hues.
A new colour must work in all 4 flavor × mode sets: text roles (`--lk-text-*`) flip lightness with the mode while hues stay
at L 0.55–0.81, and Capritarius neutrals are chroma 0 where Primary's are warm. Derive from a role with relative `oklch` (`--lc-grey`), never use one raw.

`GLOSSARY.md`, `docs/adr/` and every `src/**/CLAUDE.md` describe code. `src/docs.test.ts` fails on a backticked symbol or `.ts` path in `GLOSSARY.md` or a `src/**/CLAUDE.md` that the code no longer has (an external name goes on its allowlist). ADRs and prose are not checked: grep all of these docs for a symbol you rename or delete, and for the old owner's name next to the duty's verb when a responsibility moves, since prose about a moved duty names no deleted symbol (`mountMonthStrip` outlived its module by a release in 4 docs; `data/CLAUDE.md` kept "both hosts subscribe" after subscriptions moved into `CalendarRenderer`).

Agent skills: issue tracker → `docs/agents/issue-tracker.md`; domain docs →
`docs/agents/domain.md`; architecture/AI-readiness reports save to this repo's `temp/`,
not the skill's OS-tmp default.
