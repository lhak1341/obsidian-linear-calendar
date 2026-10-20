import type { CalendarItem } from "../types";
import { categoryLabel, countByCategory, itemsInMonths } from "../utils/category";
import type { Tooltip } from "./Tooltip";

/** Category filter chips: one per category with its item count; click toggles the category's visibility. */
export class CategoryChips {
	private lastSig: string | null = null;

	constructor(
		private el: HTMLElement,
		private tooltip: Tooltip,
		private onToggle?: (tag: string) => void,
	) {}

	/** Rebuild the chips for `months` of `year`; a no-op when nothing the chips show has changed. */
	update(
		allItems: CalendarItem[],
		year: number,
		months: number[],
		tagColorMap: Map<string, string>,
		hiddenCategories: Set<string>,
	): void {
		const categories = countByCategory(itemsInMonths(allItems, year, months));

		if (categories.size <= 1) {
			if (this.lastSig !== null) {
				this.el.empty();
				this.lastSig = null;
			}
			return;
		}

		// Skip the DOM rebuild when categories, colors, and hidden state are all unchanged.
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
			const color = tagColorMap.get(tag) ?? "#888";

			const chip = this.el.createDiv({
				cls: `lc-category-chip${isHidden ? " lc-category-hidden" : ""}`,
			});
			chip.addEventListener("mouseenter", (evt) => {
				const nameEl = chip.querySelector<HTMLElement>(".lc-category-name");
				if (nameEl && getComputedStyle(nameEl).display !== "none") return;
				this.tooltip.showForChip(displayName, evt);
			});
			chip.addEventListener("mouseleave", () => this.tooltip.hide());
			chip.createSpan({ cls: "lc-category-dot" }).style.backgroundColor = color;
			chip.createSpan({ cls: "lc-category-name", text: displayName });
			chip.createSpan({ cls: "lc-category-count", text: String(count) });

			chip.addEventListener("click", () => this.onToggle?.(tag));
		}
	}
}
