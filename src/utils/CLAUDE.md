# Utils

## Moment

- Always `import { moment } from 'obsidian'` — never `window.moment` (risks version mismatch)
  (stays prose — ruled out as a lint rule: zero occurrences and zero commits fixing one, so
  the class has never fired here. Add a `no-restricted-properties` rule the first time it does.)

## Testing

- `bunx vitest run --coverage` works (`@vitest/coverage-v8` is installed; `test/**` is excluded).
- Files importing `obsidian` **are** testable: `vitest.config.ts` aliases `obsidian` to `test/obsidian-stub.ts`, a runtime shim for the types-only npm package. Add a symbol to the stub when a file under test starts importing one — a missing export surfaces as an ordinary undefined-binding failure, not the old whole-file "Failed to resolve entry for package obsidian".
- `src/utils/frontmatterUtils.test.ts` is the worked example: fake `App` with `vault.getAbstractFileByPath` + `fileManager.processFrontMatter`/`renameFile`, real `TFile`/`TFolder` from the stub so `instanceof` holds.

## Frontmatter tag format (API gotcha)

- `frontmatter.tags` — no `#` prefix: `"linear-calendar/work"`
- `cache.tags[].tag` — has `#` prefix: `"#linear-calendar/work"`

`mapFrontmatterToItem()` (`frontmatterMapper.ts`) checks both when gating on the `#linear-calendar` tag — callers (`FrontmatterScanner.processFile`) just extract raw tags off `metadataCache` and pass them through, no interpretation.

## Daily note plugin priority

When reading daily note folder/format settings, check in order:
1. `obsidian-calendar-notes` (personal plugin) — `app.plugins.getPlugin("obsidian-calendar-notes")?.settings?.daily?.enabled` — exposes legacy compat shape via `addLegacySettingsCompat()`
2. Built-in core plugin — `app.internalPlugins.getPluginById("daily-notes")?.instance?.options`
