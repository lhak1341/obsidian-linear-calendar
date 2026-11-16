import { hueColour } from "../constants";
import type { CalendarItem, TagHue } from "../types";
import { categoryLabel, countByCategory } from "../utils/category";
import type { Tooltip } from "./Tooltip";

/**
 * Category filter chips: one per category with its hue dot, name and item count; click toggles
 * the category's visibility. Hues repeat past 8 categories, so the name tells chips apart (in a
 * narrow panel, where names hide, the tooltip names the chip).
 */
export class CategoryChips {
	private lastSig: string | null = null;

	constructor(
		private el: HTMLElement,
		private tooltip: Tooltip,
		private onToggle?: (tag: string) => void,
	) {}

	/** Rebuild the chips for the items in view; a no-op when nothing the chips show has changed. */
	update(
		itemsInView: CalendarItem[],
		tagColorMap: Map<string, TagHue>,
		hiddenCategories: Set<string>,
	): void {
		const categories = countByCategory(itemsInView);

		if (categories.size <= 1) {
			if (this.lastSig !== null) {
				this.el.empty();
				this.lastSig = null;
			}
			return;
		}

		// Skip the DOM rebuild when categories, hues and hidden state are all unchanged.
		const sig = [...categories.entries()]
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([k, v]) => `${k}:${v}:${tagColorMap.get(k) ?? ""}`)
			.join("|") + ";" + [...hiddenCategories].sort().join(",");
		if (sig === this.lastSig) return;
		this.lastSig = sig;

		this.el.empty();

		for (const [tag, count] of categories) {
			const isHidden = hiddenCategories.has(tag);
			const displayName = categoryLabel(tag);
			const hue = tagColorMap.get(tag);

			const chip = this.el.createDiv({
				cls: `lc-category-chip${isHidden ? " lc-category-hidden" : ""}`,
			});
			chip.addEventListener("mouseenter", (evt) => {
				const nameEl = chip.querySelector<HTMLElement>(".lc-category-name");
				if (nameEl && getComputedStyle(nameEl).display !== "none") return;
				this.tooltip.showForChip(displayName, evt);
			});
			chip.addEventListener("mouseleave", () => this.tooltip.hide());
			const dot = chip.createSpan({ cls: "lc-category-dot" });
			if (hue) dot.style.setProperty("--lc-hue", hueColour(hue));
			chip.createSpan({ cls: "lc-category-name", text: displayName });
			chip.createSpan({ cls: "lc-category-count", text: String(count) });

			chip.addEventListener("click", () => this.onToggle?.(tag));
		}
	}
}
