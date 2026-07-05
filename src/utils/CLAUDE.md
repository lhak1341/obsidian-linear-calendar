# Utils

## Moment

- Always `import { moment } from 'obsidian'` — never `window.moment` (risks version mismatch)

## Testing

- `@vitest/coverage-v8` not installed; `npm test -- --coverage` fails — install it first or skip coverage

## Daily note plugin priority

When reading daily note folder/format settings, check in order:
1. `obsidian-calendar-notes` (personal plugin) — `app.plugins.getPlugin("obsidian-calendar-notes")?.settings?.daily?.enabled` — exposes legacy compat shape via `addLegacySettingsCompat()`
2. Built-in core plugin — `app.internalPlugins.getPluginById("daily-notes")?.instance?.options`
