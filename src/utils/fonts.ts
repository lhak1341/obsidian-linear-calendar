import type { FontChoice } from "../types";

const FONT_VAR_RESOLVERS: Record<FontChoice, (custom: string) => string | null> = {
	"plugin":             () => null,
	"obsidian-interface": () => "var(--font-interface)",
	"obsidian-text":      () => "var(--font-text)",
	"obsidian-monospace": () => "var(--font-monospace)",
	"custom":             custom => custom || null,
};

export function resolveFontVar(choice: FontChoice, custom: string): string | null {
	return FONT_VAR_RESOLVERS[choice](custom);
}
