import type { MonthRowRef } from "./GridRenderer";

export class NowIndicator {
	private markedElements: HTMLElement[] = [];
	private createdElements: HTMLElement[] = [];
	private intervalId: number | null = null;

	render(monthRows: MonthRowRef[], year: number): void {
		this.cleanup();

		const today = new Date();
		if (today.getFullYear() !== year) return;

		// Defer to next frame so grid layout is computed
		requestAnimationFrame(() => {
			this.markToday(monthRows, today);
		});

		this.intervalId = window.setInterval(() => {
			this.clearMarks();
			this.markToday(monthRows, new Date());
		}, 3600_000);
	}

	private markToday(monthRows: MonthRowRef[], date: Date): void {
		const month = date.getMonth();
		const day = date.getDate();

		const row = monthRows.find((r) => r.month === month);
		if (!row) return;

		const daysGrid = row.barsContainer.parentElement;
		if (!daysGrid) return;

		// Circle on day number
		const cells = daysGrid.querySelectorAll(".lc-day-cell");
		const cell = cells[day - 1] as HTMLElement | undefined;
		if (!cell) return;

		const numSpan = cell.querySelector(".lc-day-num");
		if (numSpan) {
			(numSpan as HTMLElement).addClass("lc-today-circle");
			this.markedElements.push(numSpan as HTMLElement);
		}

		// Full-height column outline via absolute positioning
		daysGrid.style.position = "relative";

		const outline = document.createElement("div");
		outline.className = "lc-today-column";
		outline.style.left = `${cell.offsetLeft}px`;
		outline.style.width = `${cell.offsetWidth}px`;
		daysGrid.appendChild(outline);
		this.createdElements.push(outline);
	}

	private clearMarks(): void {
		for (const el of this.markedElements) {
			el.removeClass("lc-today-circle");
		}
		this.markedElements = [];

		for (const el of this.createdElements) {
			el.remove();
		}
		this.createdElements = [];
	}

	cleanup(): void {
		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.clearMarks();
	}
}
