# Data layer

## Obsidian tag format (API gotcha)

- `frontmatter.tags` — no `#` prefix: `"linear-calendar/work"`
- `cache.tags[].tag` — has `#` prefix: `"#linear-calendar/work"`

Check both when gating on tags (see FrontmatterScanner.ts).
