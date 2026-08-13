import { AbstractInputSuggest, App, setIcon } from "obsidian";
import { allLucideIconNames, getLucideIconTags, resolveLucideIconId } from "./lucide-icons";
import { rankIconSuggestions } from "./utils/iconSearch";

/** Autocomplete for Lucide icon ids, backed by the full offline Lucide set (native + gap-filled). */
export class IconSuggest extends AbstractInputSuggest<string> {
	constructor(app: App, private inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): string[] {
		return rankIconSuggestions(query, allLucideIconNames(), getLucideIconTags);
	}

	renderSuggestion(iconName: string, el: HTMLElement): void {
		el.addClass("lc-icon-suggest-item");
		setIcon(el.createSpan({ cls: "lc-icon-suggest-icon" }), resolveLucideIconId(iconName));
		el.createSpan({ text: iconName });
	}

	selectSuggestion(iconName: string): void {
		this.setValue(iconName);
		this.inputEl.trigger("input");
		this.close();
	}
}
