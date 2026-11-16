/**
 * A small editor that opens under a settings-tab tag chip, in Obsidian's menu chrome. It closes
 * on Escape or a press outside it (except inside a suggestion popover, which Obsidian mounts on
 * `body`), and gives focus back to its chip. It carries `lk-root`: the settings tab sits outside
 * every root, and the hue swatches read the contract hues.
 */
export class TagPopover {
	readonly el: HTMLElement;
	private closed = false;
	private readonly onPointer = (evt: PointerEvent) => {
		const target = evt.target as Node | null;
		if (!target || this.el.contains(target) || this.anchor.contains(target)) return;
		if (target.instanceOf(Element) && target.closest(".suggestion-container")) return;
		this.close();
	};
	private readonly onKey = (evt: KeyboardEvent) => {
		if (evt.key !== "Escape") return;
		evt.stopPropagation();
		this.close();
	};

	constructor(
		private readonly anchor: HTMLElement,
		label: string,
		private readonly onClose: () => void,
	) {
		const doc = anchor.doc;
		this.el = doc.body.createDiv({ cls: "menu lc-tag-popover lk-root", attr: { role: "dialog", "aria-label": label } });
		const rect = anchor.getBoundingClientRect();
		const width = 288;
		this.el.style.setProperty("--lc-popover-left", `${Math.max(8, Math.min(rect.left, doc.documentElement.clientWidth - width - 8))}px`);
		this.el.style.setProperty("--lc-popover-top", `${rect.bottom + 6}px`);
		anchor.setAttr("aria-expanded", "true");
		doc.addEventListener("pointerdown", this.onPointer, true);
		// Capture, so Escape closes the popover before the settings modal sees it.
		doc.addEventListener("keydown", this.onKey, true);
	}

	/** Moves focus to the first control, once the caller has filled the popover. */
	focusFirst(): void {
		this.el.querySelector<HTMLElement>("input, button")?.focus();
	}

	/** True when this popover belongs to `el`, so a second click on its chip closes it. */
	isFor(el: HTMLElement): boolean {
		return this.anchor === el;
	}

	close(): void {
		if (this.closed) return;
		this.closed = true;
		const doc = this.anchor.doc;
		// Blur a focused field first: its `change` (the icon field's commit) never fires once removed.
		const active = doc.activeElement;
		if (active instanceof HTMLElement && this.el.contains(active)) active.blur();
		doc.removeEventListener("pointerdown", this.onPointer, true);
		doc.removeEventListener("keydown", this.onKey, true);
		this.el.remove();
		this.anchor.setAttr("aria-expanded", "false");
		if (this.anchor.isConnected) this.anchor.focus();
		this.onClose();
	}
}
