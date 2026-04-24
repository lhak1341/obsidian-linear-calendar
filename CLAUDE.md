# obsidian-linear-calendar

Obsidian plugin — horizontal year-at-a-glance timeline rendered from note frontmatter.

## Build & Test

- `npm run build` — production build → main.js
- `npm run deploy` — build + copy main.js, manifest.json, styles.css to test-vault plugin dir
- No test framework — test manually in Obsidian with test-vault
- Uses esbuild (not webpack/vite)

## Conventions

- All CSS in single `styles.css` (Obsidian plugin convention)
- Only use Obsidian CSS custom properties (`var(--...)`) for theme compatibility
