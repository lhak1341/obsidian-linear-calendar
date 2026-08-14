import { App, setIcon } from "obsidian";
import { IconSuggest } from "./IconSuggest";
import { resolveLucideIconId } from "./lucide-icons";

interface IconFieldOptions {
	initialValue?: string;
	placeholder?: string;
	/** Fires on every keystroke and suggestion pick — value may still be in flux. */
	onPreview?: (value: string) => void;
	/** Fires on blur — value is settled. */
	onCommit?: (value: string) => void;
}

/** Icon text input + live preview + Lucide autocomplete, wired as one widget. */
export class IconField {
	readonly inputEl: HTMLInputElement;
	private readonly previewEl: HTMLSpanElement;

	constructor(app: App, parentEl: HTMLElement, options: IconFieldOptions = {}) {
		const wrap = parentEl.createSpan({ cls: "lc-icon-input-wrap" });
		this.inputEl = wrap.createEl("input", {
			cls: "lc-icon-input",
			attr: { type: "text", placeholder: options.placeholder ?? "Icon name", value: options.initialValue ?? "" },
		});
		this.previewEl = wrap.createSpan({ cls: "lc-icon-preview" });
		if (options.initialValue) setIcon(this.previewEl, resolveLucideIconId(options.initialValue));

		new IconSuggest(app, this.inputEl);

		this.inputEl.addEventListener("input", () => {
			const value = this.inputEl.value.trim();
			this.previewEl.empty();
			if (value) setIcon(this.previewEl, resolveLucideIconId(value));
			options.onPreview?.(value);
		});
		this.inputEl.addEventListener("change", () => {
			options.onCommit?.(this.inputEl.value.trim());
		});
	}
}
