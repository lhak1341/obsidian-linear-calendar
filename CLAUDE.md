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
- Bar colors set via inline `style.backgroundColor` in JS — CSS cannot override inline styles; color adaptations (contrast, theming) must be handled in JS at render time
- For dynamic colors needed by CSS pseudo-elements (::before, :hover), use `style.setProperty("--var", value)` and reference `var(--var)` in CSS rules
- `color-mix(in srgb, var(--color-accent) 12%, transparent)` works — Obsidian uses Chromium 114+
- Use `this.registerDomEvent()` for all DOM event listeners in views — raw `addEventListener` on `contentEl` leaks across open/close cycles
- Sticky headers need `z-index` > 5 (bars use `z-index: 5`) or they get painted over on scroll
- To fill a cell with a dynamic background, put the class on the container or use `position: absolute; inset: 0` — `width/height: 100%` on a `<span>` inside a flex column is unreliable
