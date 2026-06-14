# Utils

## Moment

- Always `import { moment } from 'obsidian'` — never `window.moment` (risks version mismatch)

## Testing

- `@vitest/coverage-v8` not installed; `npm test -- --coverage` fails — install it first or skip coverage

## Daily note plugin priority

When reading daily note folder/format settings, check in order:
1. `lhak-periodic-notes` (fork) — `app.plugins.getPlugin("lhak-periodic-notes")?.settings?.daily?.enabled`
2. `periodic-notes` (upstream) — `app.plugins.getPlugin("periodic-notes")?.settings?.daily?.enabled`
3. Built-in core plugin — `app.internalPlugins.getPluginById("daily-notes")?.instance?.options`
