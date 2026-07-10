import { AbstractInputSuggest, App, getIconIds, setIcon } from "obsidian";

// Obsidian's icon resolver accepts both "lucide-cake" and the bare "cake" for
// built-in Lucide icons — the bare form is shorter and matches how icon names
// already get stored elsewhere in this plugin (e.g. iconMap), so strip it for
// display and for the value written into the input.
const stripLucidePrefix = (id: string) => id.startsWith("lucide-") ? id.slice("lucide-".length) : id;

/** Autocomplete for Lucide icon ids, backed by Obsidian's own icon registry. */
export class IconSuggest extends AbstractInputSuggest<string> {
	constructor(app: App, private inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): string[] {
		const q = query.trim().toLowerCase();
		const all = getIconIds();
		return q ? all.filter((id) => id.toLowerCase().includes(q)) : all;
	}

	renderSuggestion(iconId: string, el: HTMLElement): void {
		el.addClass("lc-icon-suggest-item");
		setIcon(el.createSpan({ cls: "lc-icon-suggest-icon" }), iconId);
		el.createSpan({ text: stripLucidePrefix(iconId) });
	}

	selectSuggestion(iconId: string): void {
		this.setValue(stripLucidePrefix(iconId));
		this.inputEl.trigger("input");
		this.close();
	}
}
