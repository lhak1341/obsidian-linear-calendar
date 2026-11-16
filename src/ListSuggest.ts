import { AbstractInputSuggest, type App } from "obsidian";

/**
 * Type-ahead over a fixed list of names (folders, files, property keys) for a settings text
 * field. A pick writes the input and fires its `input` and `change` events, so the field's own
 * handlers save it as if typed.
 */
export class ListSuggest extends AbstractInputSuggest<string> {
	constructor(
		app: App,
		private readonly inputEl: HTMLInputElement,
		private readonly names: () => readonly string[],
	) {
		super(app, inputEl);
		this.limit = 50;
	}

	protected getSuggestions(query: string): string[] {
		const q = query.trim().toLowerCase();
		return this.names().filter((name) => name !== query && name.toLowerCase().includes(q));
	}

	renderSuggestion(name: string, el: HTMLElement): void {
		el.setText(name);
	}

	selectSuggestion(name: string): void {
		this.setValue(name);
		this.inputEl.dispatchEvent(new Event("input"));
		this.inputEl.dispatchEvent(new Event("change"));
		this.close();
	}
}
