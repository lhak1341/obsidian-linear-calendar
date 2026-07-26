import type { AlignMode, DailyNoteStyle } from "../types";
import { MAX_WATERFALL_COLS_VERT } from "../constants";

function computeTint(color: string | null, hover: boolean): string {
	const pct = hover ? 22 : 12;
	if (!color) return `color-mix(in srgb, var(--color-accent) ${pct}%, transparent)`;
	const r = parseInt(color.slice(1, 3), 16);
	const g = parseInt(color.slice(3, 5), 16);
	const b = parseInt(color.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${hover ? 0.25 : 0.15})`;
}

function computeSolidColor(color: string | null): string {
	return color ?? "var(--color-accent)";
}

const MONTH_NAMES = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEKDAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_KANJI = ["日", "月", "火", "水", "木", "金", "土"];


export interface MonthRowRef {
	month: number;
	barsContainer: HTMLElement;
	daysInMonth: number;
	weekdayOffset: number;
	totalCols: number;
	layout: "horizontal" | "vertical";
}

export interface GridRenderCallbacks {
	onDayClick: (year: number, month: number, day: number) => void;
	onDayDblClick?: (year: number, month: number, day: number) => void;
	onDayContextMenu?: (year: number, month: number, day: number, event: MouseEvent) => void;
}

export interface GridRenderOptions {
	year: number;
	months: number[];
	layout: "horizontal" | "vertical";
	alignMode: AlignMode;
	dailyNoteDates: Set<string>;
	dailyNoteColor: string | null;
	dailyNoteStyle: DailyNoteStyle;
	japaneseWeekdayLabels: boolean;
	callbacks: GridRenderCallbacks;
}

export class GridRenderer {
	private containerEl: HTMLElement;
	private monthRows: MonthRowRef[] = [];
	private onDayClick?: (year: number, month: number, day: number) => void;
	private onDayDblClick?: (year: number, month: number, day: number) => void;
	private onDayContextMenu?: (year: number, month: number, day: number, event: MouseEvent) => void;

	// Render-pass-constant state, set once per render() call and read by every private method below.
	private year!: number;
	private alignMode!: AlignMode;
	private dailyNoteDates!: Set<string>;
	private dailyNoteColor!: string | null;
	private dailyNoteStyle!: DailyNoteStyle;
	private japaneseWeekdayLabels!: boolean;
	private totalCols = 0;
	private colTemplate = "";

	constructor(parentEl: HTMLElement) {
		this.containerEl = parentEl.createDiv({ cls: "linear-calendar-grid" });
	}

	render(options: GridRenderOptions): MonthRowRef[] {
		const { year, months, layout, alignMode, dailyNoteDates, dailyNoteColor, dailyNoteStyle, japaneseWeekdayLabels, callbacks } = options;

		this.year = year;
		this.alignMode = alignMode;
		this.dailyNoteDates = dailyNoteDates;
		this.dailyNoteColor = dailyNoteColor;
		this.dailyNoteStyle = dailyNoteStyle;
		this.japaneseWeekdayLabels = japaneseWeekdayLabels;

		this.onDayClick = callbacks.onDayClick;
		this.onDayDblClick = callbacks.onDayDblClick;
		this.onDayContextMenu = callbacks.onDayContextMenu;

		if (months.length === 1) {
			this.monthRows = [this.renderSingleMonth(months[0])];
		} else if (layout === "vertical") {
			this.monthRows = this.renderVerticalGrid();
		} else {
			this.monthRows = this.renderFullYear();
		}

		return this.monthRows;
	}

	private renderFullYear(): MonthRowRef[] {
		this.containerEl.empty();
		this.containerEl.removeClass("lc-vert-grid");
		this.containerEl.addClass("linear-calendar-grid");
		this.containerEl.style.removeProperty("grid-template-columns");
		this.containerEl.style.removeProperty("grid-template-rows");
		this.containerEl.style.removeProperty("min-width");

		this.totalCols = this.computeAlignedSize();
		this.colTemplate = `repeat(${this.totalCols}, 1fr)`;

		const rows: MonthRowRef[] = [];
		for (let m = 0; m < 12; m++) {
			const days = new Date(this.year, m + 1, 0).getDate();
			rows.push(this.renderMonthRow(m, days));
		}

		return rows;
	}

	private renderVerticalGrid(): MonthRowRef[] {
		this.containerEl.empty();

		this.containerEl.removeClass("linear-calendar-grid");
		this.containerEl.addClass("lc-vert-grid");
		this.containerEl.style.removeProperty("min-width");

		const totalRows = this.computeAlignedSize();
		const rows: MonthRowRef[] = [];

		// Month headers (row 1)
		for (let m = 0; m < 12; m++) {
			const header = this.containerEl.createDiv({ cls: "lc-vert-month-header" });
			header.textContent = MONTH_NAMES[m];
			header.style.gridColumn = `${m + 1}`;
		}

		// Per-month containers — each holds day cells (col 1) + bars (cols 2+)
		for (let m = 0; m < 12; m++) {
			const daysInMonth = new Date(this.year, m + 1, 0).getDate();
			const firstDow = new Date(this.year, m, 1).getDay();
			const weekdayOffset = this.alignMode === "weekday" ? firstDow : 0;

			const monthCol = this.containerEl.createDiv({ cls: "lc-vert-month-col" });
			monthCol.style.gridColumn = `${m + 1}`;
			monthCol.style.gridTemplateRows = `repeat(${totalRows}, var(--lc-vert-row-h, 20px))`;
			monthCol.style.gridTemplateColumns = `22px repeat(${MAX_WATERFALL_COLS_VERT}, 16px)`;

			for (let d = 1; d <= daysInMonth; d++) {
				const cellEl = monthCol.createDiv({ cls: "lc-vert-day-cell" });
				cellEl.style.gridRow = `${weekdayOffset + d}`;
				cellEl.dataset.day = String(d);
				this.populateDayCell(cellEl, m, d, firstDow);
			}

			rows.push({
				month: m,
				barsContainer: monthCol,
				daysInMonth,
				weekdayOffset,
				totalCols: MAX_WATERFALL_COLS_VERT,
				layout: "vertical",
			});
		}

		return rows;
	}

	private renderSingleMonth(month: number): MonthRowRef {
		this.containerEl.empty();
		this.containerEl.removeClass("lc-vert-grid");
		this.containerEl.addClass("linear-calendar-grid");
		this.containerEl.style.removeProperty("grid-template-columns");
		this.containerEl.style.removeProperty("grid-template-rows");
		this.containerEl.style.removeProperty("min-width");

		this.totalCols = this.computeAlignedSize();
		this.colTemplate = `repeat(${this.totalCols}, 1fr)`;
		const daysInMonth = new Date(this.year, month + 1, 0).getDate();

		return this.renderMonthRow(month, daysInMonth);
	}

	private renderMonthRow(month: number, daysInMonth: number): MonthRowRef {
		const row = this.containerEl.createDiv({ cls: "lc-month-row" });

		row.createDiv({
			cls: "lc-month-label",
			text: MONTH_NAMES[month],
		});

		const daysGrid = row.createDiv({ cls: "lc-days-grid" });
		daysGrid.style.gridTemplateColumns = this.colTemplate;

		// Compute first-of-month DOW once; derive per-day DOW by modular arithmetic.
		const firstDow = new Date(this.year, month, 1).getDay();
		const weekdayOffset = this.alignMode === "weekday" ? firstDow : 0;

		if (this.alignMode === "date") {
			for (let d = 1; d <= 31; d++) {
				const cellEl = daysGrid.createDiv({ cls: "lc-day-cell" });
				cellEl.style.gridColumn = `${d}`;
				if (d > daysInMonth) { cellEl.addClass("lc-day-empty"); continue; }
				this.populateDayCell(cellEl, month, d, firstDow);
			}
		} else {
			for (let d = 1; d <= daysInMonth; d++) {
				const cellEl = daysGrid.createDiv({ cls: "lc-day-cell" });
				cellEl.style.gridColumn = `${weekdayOffset + d}`;
				this.populateDayCell(cellEl, month, d, firstDow);
			}
		}

		const barsContainer = daysGrid.createDiv({
			cls: "lc-bars-container",
		});

		return { month, barsContainer, daysInMonth, weekdayOffset, totalCols: this.totalCols, layout: "horizontal" };
	}

	private computeAlignedSize(): number {
		if (this.alignMode !== "weekday") return 31;
		let max = 31;
		for (let m = 0; m < 12; m++) {
			const offset = new Date(this.year, m, 1).getDay();
			const days = new Date(this.year, m + 1, 0).getDate();
			max = Math.max(max, offset + days);
		}
		return max;
	}

	private populateDayCell(
		cellEl: HTMLElement,
		month: number,
		day: number,
		firstDow: number,
	): void {
		const dow = (firstDow + day - 1) % 7;
		if (dow === 0 || dow === 6) cellEl.addClass("lc-day-weekend");

		const dateKey = `${this.year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		const hasDailyNote = this.dailyNoteDates.has(dateKey);
		if (hasDailyNote) cellEl.addClass("lc-has-daily-note");

		cellEl.createSpan({ cls: "lc-day-num", text: String(day) });
		cellEl.createSpan({ cls: "lc-day-weekday", text: (this.japaneseWeekdayLabels ? WEEKDAY_KANJI : WEEKDAY_ABBR)[dow] });

		this.attachCellHandlers(cellEl, month, day, hasDailyNote);
	}

	private attachCellHandlers(
		cellEl: HTMLElement,
		month: number,
		day: number,
		hasDailyNote: boolean,
	): void {
		if (hasDailyNote) {
			if (this.dailyNoteStyle === "tint") {
				cellEl.addClass("lc-daily-tint");
				cellEl.style.setProperty("--lc-daily-tint", computeTint(this.dailyNoteColor, false));
				cellEl.style.setProperty("--lc-daily-tint-hover", computeTint(this.dailyNoteColor, true));
			} else {
				cellEl.addClass("lc-daily-border-top");
				cellEl.style.setProperty("--lc-daily-color", computeSolidColor(this.dailyNoteColor));
			}

			let singleClickTimer: ReturnType<typeof setTimeout> | null = null;
			cellEl.addEventListener("click", () => {
				singleClickTimer = window.setTimeout(() => {
					this.onDayClick?.(this.year, month, day);
					singleClickTimer = null;
				}, 220);
			});
			cellEl.addEventListener("dblclick", () => {
				if (singleClickTimer) {
					window.clearTimeout(singleClickTimer);
					singleClickTimer = null;
				}
				this.onDayDblClick?.(this.year, month, day);
			});
		} else {
			cellEl.addEventListener("dblclick", () => {
				this.onDayDblClick?.(this.year, month, day);
			});
		}

		cellEl.addEventListener("contextmenu", (event: MouseEvent) => {
			event.preventDefault();
			this.onDayContextMenu?.(this.year, month, day, event);
		});
	}

	getContainer(): HTMLElement {
		return this.containerEl;
	}

	getMonthRows(): MonthRowRef[] {
		return this.monthRows;
	}
}
