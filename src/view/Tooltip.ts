import { formatDateRange } from "../utils/dateUtils";
import { formatTagLabel } from "../utils/tagUtils";
import type { BarInfo } from "./BarRenderer";

export class Tooltip {
	private el: HTMLElement;
	private attached = false;
	private visible = false;

	constructor(parentEl: HTMLElement) {
		this.el = parentEl.createDiv({ cls: "linear-calendar-tooltip lc-hidden" });
	}

	attach(container: HTMLElement, getBarInfo: (el: HTMLElement) => BarInfo | undefined): void {
		if (this.attached) return;
		this.attached = true;

		container.addEventListener("mouseenter", (evt) => {
			const target = evt.target as HTMLElement;
			if (!target.classList.contains("calendar-bar")) return;
			const barInfo = getBarInfo(target);
			if (!barInfo) return;
			this.show(barInfo, evt);
		}, true);

		container.addEventListener("mousemove", (evt) => {
			const target = evt.target as HTMLElement;
			if (!target.classList.contains("calendar-bar")) return;
			if (this.visible) {
				this.reposition(evt);
			}
		}, true);

		container.addEventListener("mouseleave", (evt) => {
			const target = evt.target as HTMLElement;
			if (!target.classList.contains("calendar-bar")) return;
			const related = evt.relatedTarget as HTMLElement | null;
			if (related && target.contains(related)) return;
			this.hide();
		}, true);
	}

	private show(barInfo: BarInfo, evt: MouseEvent): void {
		const { item, tagColor } = barInfo;

		this.el.empty();
		this.el.createDiv({ cls: "tooltip-title", text: item.title });

		const metaRow = this.el.createDiv({ cls: "tooltip-meta" });
		metaRow.createSpan({ cls: "tooltip-dates", text: formatDateRange(item.dateStart, item.dateEnd) });
		if (item.tags?.length) {
			for (const tag of item.tags) {
				const chip = metaRow.createSpan({ cls: "tooltip-tag-chip" });
				const dot = chip.createSpan({ cls: "tooltip-tag-dot" });
				dot.style.backgroundColor = tagColor || "#888";
				chip.createSpan({ text: formatTagLabel(tag) });
			}
		}

		if (item.description) {
			this.el.createDiv({ cls: "tooltip-description", text: item.description });
		}

		this.visible = true;
		this.el.removeClass("lc-hidden");
		this.reposition(evt);
	}

	private reposition(evt: MouseEvent): void {
		const parentRect = this.el.parentElement!.getBoundingClientRect();
		const tooltipH = this.el.offsetHeight;
		const tooltipW = this.el.offsetWidth;

		let top = evt.clientY - parentRect.top - tooltipH - 10;
		let left = evt.clientX - parentRect.left + 12;

		// Flip below cursor if too close to top
		if (top < 0) {
			top = evt.clientY - parentRect.top + 14;
		}

		// Clamp horizontally
		const maxLeft = parentRect.width - tooltipW;
		if (left > maxLeft) left = evt.clientX - parentRect.left - tooltipW - 12;
		if (left < 0) left = 0;

		this.el.style.top = `${top}px`;
		this.el.style.left = `${left}px`;
	}

	showForChip(name: string, evt: MouseEvent): void {
		this.el.empty();
		this.el.createDiv({ cls: "tooltip-title", text: name });
		this.visible = true;
		this.el.removeClass("lc-hidden");
		this.reposition(evt);
	}

	hide(): void {
		this.visible = false;
		this.el.addClass("lc-hidden");
	}

	cleanup(): void {
		this.el.remove();
	}
}
