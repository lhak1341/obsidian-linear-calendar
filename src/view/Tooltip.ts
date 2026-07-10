export class Tooltip {
	private el: HTMLElement;
	private attached = false;
	private visible = false;

	constructor(parentEl: HTMLElement) {
		this.el = parentEl.createDiv({ cls: "linear-calendar-tooltip lc-hidden" });
	}

	attach(container: HTMLElement): void {
		if (this.attached) return;
		this.attached = true;

		container.addEventListener("mouseenter", (evt) => {
			const target = evt.target as HTMLElement;
			if (!target.classList.contains("calendar-bar")) return;
			this.show(target, evt);
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

	private show(barEl: HTMLElement, evt: MouseEvent): void {
		const title = barEl.dataset.title ?? "";
		const dateRange = barEl.dataset.dateRange ?? "";
		const tags = barEl.dataset.tags ?? "";
		const tagColor = barEl.dataset.tagColor ?? "";
		const description = barEl.dataset.description ?? "";

		this.el.empty();
		this.el.createDiv({ cls: "tooltip-title", text: title });

		const metaRow = this.el.createDiv({ cls: "tooltip-meta" });
		metaRow.createSpan({ cls: "tooltip-dates", text: dateRange });
		if (tags) {
			for (const tag of tags.split(", ")) {
				const chip = metaRow.createSpan({ cls: "tooltip-tag-chip" });
				const dot = chip.createSpan({ cls: "tooltip-tag-dot" });
				dot.style.backgroundColor = tagColor || "#888";
				chip.createSpan({ text: tag.replace(/^linear-calendar\//, "") });
			}
		}

		if (description) {
			this.el.createDiv({ cls: "tooltip-description", text: description });
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
