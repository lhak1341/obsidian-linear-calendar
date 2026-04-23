const MONTH_NAMES = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEKDAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface MonthRowRef {
	month: number;
	barsContainer: HTMLElement;
	daysInMonth: number;
}

export class GridRenderer {
	private containerEl: HTMLElement;
	private monthRows: MonthRowRef[] = [];
	private onDayClick?: (year: number, month: number, day: number) => void;

	constructor(parentEl: HTMLElement) {
		this.containerEl = parentEl.createDiv({ cls: "linear-calendar-grid" });
	}

	setDayClickHandler(handler: (year: number, month: number, day: number) => void): void {
		this.onDayClick = handler;
	}

	/**
	 * @param colMinWidth - 0 = fit to screen (pure 1fr), >0 = minmax(Npx, 1fr)
	 */
	render(year: number, colMinWidth = 0): MonthRowRef[] {
		this.containerEl.empty();
		this.monthRows = [];

		const colTemplate =
			colMinWidth > 0
				? `repeat(31, minmax(${colMinWidth}px, 1fr))`
				: "repeat(31, 1fr)";

		// Remove min-width constraint when fitting to screen
		this.containerEl.style.minWidth = colMinWidth > 0 ? "max-content" : "";

		for (let m = 0; m < 12; m++) {
			const days = new Date(year, m + 1, 0).getDate();
			const rowRef = this.renderMonthRow(year, m, days, colTemplate);
			this.monthRows.push(rowRef);
		}

		return this.monthRows;
	}

	private renderMonthRow(
		year: number,
		month: number,
		daysInMonth: number,
		colTemplate: string,
	): MonthRowRef {
		const row = this.containerEl.createDiv({ cls: "lc-month-row" });

		row.createDiv({
			cls: "lc-month-label",
			text: MONTH_NAMES[month],
		});

		const daysGrid = row.createDiv({ cls: "lc-days-grid" });
		daysGrid.style.gridTemplateColumns = colTemplate;

		for (let d = 1; d <= 31; d++) {
			const cellEl = daysGrid.createDiv({ cls: "lc-day-cell" });
			cellEl.style.gridColumn = `${d}`;
			cellEl.style.gridRow = "1";

			if (d > daysInMonth) {
				cellEl.addClass("lc-day-empty");
				continue;
			}

			const date = new Date(year, month, d);
			const dow = date.getDay();

			if (dow === 0 || dow === 6) {
				cellEl.addClass("lc-day-weekend");
			}

			cellEl.createSpan({
				cls: "lc-day-num",
				text: String(d),
			});

			cellEl.createSpan({
				cls: "lc-day-weekday",
				text: WEEKDAY_ABBR[dow],
			});

			cellEl.addEventListener("click", () => {
				this.onDayClick?.(year, month, d);
			});
			cellEl.style.cursor = "pointer";
		}

		const barsContainer = daysGrid.createDiv({
			cls: "lc-bars-container",
		});

		return { month, barsContainer, daysInMonth };
	}

	getContainer(): HTMLElement {
		return this.containerEl;
	}

	getMonthRows(): MonthRowRef[] {
		return this.monthRows;
	}
}
