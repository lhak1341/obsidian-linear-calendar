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
		},
	},
]);
