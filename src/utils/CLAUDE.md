# Utils

## Moment

- Always `import { moment } from 'obsidian'` — never `window.moment` (risks version mismatch)

## Testing

- `@vitest/coverage-v8` not installed; `npm test -- --coverage` fails — install it first or skip coverage
- Before adding a test for a new pure export, check the file doesn't already `import ... from "obsidian"` (e.g. `frontmatterUtils.ts`, `dailyNotes.ts`) — vitest fails with "Failed to resolve entry for package obsidian" for the whole file, even for unrelated pure functions. Put new pure logic in a fresh file instead.

## Daily note plugin priority

When reading daily note folder/format settings, check in order:
1. `obsidian-calendar-notes` (personal plugin) — `app.plugins.getPlugin("obsidian-calendar-notes")?.settings?.daily?.enabled` — exposes legacy compat shape via `addLegacySettingsCompat()`
2. Built-in core plugin — `app.internalPlugins.getPluginById("daily-notes")?.instance?.options`
