import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	...obsidianmd.configs.recommended,
	{
		files: ["src/**/*.ts"],
		ignores: ["src/**/*.test.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: { project: "./tsconfig.json" },
		},
		rules: {
			// Many settings placeholders are literal frontmatter keys or Moment.js format
			// tokens (datestart, YYYY-MM-DD) where case is meaningful and not prose.
			"obsidianmd/ui/sentence-case": ["warn", {
				ignoreRegex: ["^datestart$", "^dateend$", "^description$", "^YYYY-MM-DD$", "^[Ee]\\.g\\."],
				brands: ["Templater", "Inter", "DM Sans", "Lucide"],
			}],
			// LinearCalendarSettingTab's tag-color/icon rows are dynamic, vault-scanned
			// data with custom multi-swatch + icon-field controls -- the declarative API
			// (SettingDefinitionList) would need custom render() rows anyway, and its
			// extra wrapper DOM around .setting-item/.setting-item-control previously
			// broke this file's structural CSS. Advisory-only (search indexing), and
			// manifest.json's minAppVersion (1.8.0) is well below the 1.13.0 this
			// targets. Revisit if the settings CSS stops depending on Setting's bare
			// DOM shape.
			"obsidianmd/settings-tab/prefer-setting-definitions": "off",
		},
	},
]);
