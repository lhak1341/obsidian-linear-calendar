import { debounce } from "obsidian";
import type { TFile } from "obsidian";
import type { DailyNoteStyle } from "../types";
import { MAX_WATERFALL_COLS_VERT } from "../constants";
import type { RangeCell, RangeRow, ResolvedRange } from "../utils/viewRange";

function computeTint(color: string | null, hover: boolean): string {
	const pct = hover ? 22 : 12;
	if (!color) return `color-mix(in srgb, var(--lk-accent) ${pct}%, transparent)`;
	const r = parseInt(color.slice(1, 3), 16);
	const g = parseInt(color.slice(3, 5), 16);
	const b = parseInt(color.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${hover ? 0.25 : 0.15})`;
}

function computeSolidColor(color: string | null): string {
	return color ?? "var(--lk-accent)";
}

const WEEKDAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_KANJI = ["日", "月", "火", "水", "木", "金", "土"];


/** A rendered row of the range: where its bars go and how their spans map onto its grid. */
export interface RowRef {
	/** Index into the range's rows; matches `DaySpan.row`. */
	row: number;
	barsContainer: HTMLElement;
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
	range: ResolvedRange;
	/** The day's daily note, if it has one. */
	dailyNoteAt: (year: number, month: number, day: number) => TFile | undefined;
	dailyNoteColor: string | null;
	dailyNoteStyle: DailyNoteStyle;
	japaneseWeekdayLabels: boolean;
	callbacks: GridRenderCallbacks;
}

/** Draws the range's rows as day cells. Which days a row holds, and where, is the range's business. */
export class GridRenderer {
	private containerEl: HTMLElement;
	private rowRefs: RowRef[] = [];
	private onDayClick?: (year: number, month: number, day: number) => void;
	private onDayDblClick?: (year: number, month: number, day: number) => void;
	private onDayContextMenu?: (year: number, month: number, day: number, event: MouseEvent) => void;

	// Render-pass-constant state, set once per render() call and read by every private method below.
	private dailyNoteAt!: (year: number, month: number, day: number) => TFile | undefined;
	private dailyNoteColor!: string | null;
	private dailyNoteStyle!: DailyNoteStyle;
	private japaneseWeekdayLabels!: boolean;

	constructor(parentEl: HTMLElement) {
		this.containerEl = parentEl.createDiv({ cls: "linear-calendar-grid" });
	}

	render(options: GridRenderOptions): RowRef[] {
		const { range, dailyNoteAt, dailyNoteColor, dailyNoteStyle, japaneseWeekdayLabels, callbacks } = options;

		this.dailyNoteAt = dailyNoteAt;
		this.dailyNoteColor = dailyNoteColor;
		this.dailyNoteStyle = dailyNoteStyle;
		this.japaneseWeekdayLabels = japaneseWeekdayLabels;

		this.onDayClick = callbacks.onDayClick;
		this.onDayDblClick = callbacks.onDayDblClick;
		this.onDayContextMenu = callbacks.onDayContextMenu;

		this.rowRefs = range.layout === "vertical" ? this.renderVertical(range.rows) : this.renderHorizontal(range.rows);
		return this.rowRefs;
	}

	/** One `.lc-month-row` per range row, days along the columns. */
	private renderHorizontal(rows: RangeRow[]): RowRef[] {
		this.containerEl.empty();
		this.containerEl.removeClass("lc-vert-grid");
		this.containerEl.addClass("linear-calendar-grid");
		this.containerEl.style.removeProperty("grid-template-columns");
		this.containerEl.style.removeProperty("grid-template-rows");
		this.containerEl.style.removeProperty("min-width");

		return rows.map((range, row) => {
			const rowEl = this.containerEl.createDiv({ cls: "lc-month-row" });
			rowEl.createDiv({ cls: "lc-month-label", text: range.label });

			const daysGrid = rowEl.createDiv({ cls: "lc-days-grid" });
			daysGrid.style.gridTemplateColumns = `repeat(${range.columns}, 1fr)`;

			for (const cell of range.cells) {
				const cellEl = daysGrid.createDiv({ cls: "lc-day-cell" });
				cellEl.style.gridColumn = `${cell.column + 1}`;
				this.populateDayCell(cellEl, cell);
				if (cell.monthStart) {
					cellEl.addClass("lc-day-month-start");
					cellEl.querySelector(".lc-day-num")?.setText(`${cell.month + 1}/1`);
				}
			}
			for (const column of range.emptyColumns) {
				const cellEl = daysGrid.createDiv({ cls: "lc-day-cell" });
				cellEl.style.gridColumn = `${column + 1}`;
				cellEl.addClass("lc-day-empty");
			}

			const barsContainer = daysGrid.createDiv({ cls: "lc-bars-container" });
			return { row, barsContainer, weekdayOffset: range.weekdayOffset, totalCols: range.columns, layout: "horizontal" };
		});
	}

	/** One column per range row (a year's months), days down the grid rows. */
	private renderVertical(rows: RangeRow[]): RowRef[] {
		this.containerEl.empty();

		this.containerEl.removeClass("linear-calendar-grid");
		this.containerEl.addClass("lc-vert-grid");
		this.containerEl.style.removeProperty("min-width");

		// Month headers (row 1)
		rows.forEach((range, row) => {
			const header = this.containerEl.createDiv({ cls: "lc-vert-month-header" });
			header.textContent = range.label;
			header.style.gridColumn = `${row + 1}`;
		});

		// Per-month containers — each holds day cells (col 1) + bars (cols 2+)
		return rows.map((range, row) => {
			const monthCol = this.containerEl.createDiv({ cls: "lc-vert-month-col" });
			monthCol.style.gridColumn = `${row + 1}`;
			monthCol.style.gridTemplateRows = `repeat(${range.columns}, var(--lc-vert-row-h, 20px))`;
			monthCol.style.gridTemplateColumns = `22px repeat(${MAX_WATERFALL_COLS_VERT}, 16px)`;

			for (const cell of range.cells) {
				const cellEl = monthCol.createDiv({ cls: "lc-vert-day-cell" });
				cellEl.style.gridRow = `${cell.column + 1}`;
				cellEl.dataset.day = String(cell.day);
				this.populateDayCell(cellEl, cell);
			}

			return { row, barsContainer: monthCol, weekdayOffset: range.weekdayOffset, totalCols: MAX_WATERFALL_COLS_VERT, layout: "vertical" };
		});
	}

	private populateDayCell(cellEl: HTMLElement, { year, month, day, weekday: dow }: RangeCell): void {
		if (dow === 0 || dow === 6) cellEl.addClass("lc-day-weekend");

		const hasDailyNote = this.dailyNoteAt(year, month, day) !== undefined;
		if (hasDailyNote) cellEl.addClass("lc-has-daily-note");

		cellEl.createSpan({ cls: "lc-day-num", text: String(day) });
		cellEl.createSpan({ cls: "lc-day-weekday", text: (this.japaneseWeekdayLabels ? WEEKDAY_KANJI : WEEKDAY_ABBR)[dow] });

		this.attachCellHandlers(cellEl, year, month, day, hasDailyNote);
	}

	private attachCellHandlers(
		cellEl: HTMLElement,
		year: number,
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

			// Fires on a single click only once 220ms pass with no dblclick — debounce() with
			// `resetTimer: true` both delays and (via `.cancel()`) disambiguates against a
			// following dblclick.
			const singleClickDebounced = debounce(
				() => this.onDayClick?.(year, month, day),
				220,
				true,
			);
			cellEl.addEventListener("click", () => singleClickDebounced());
			cellEl.addEventListener("dblclick", () => {
				singleClickDebounced.cancel();
				this.onDayDblClick?.(year, month, day);
			});
		} else {
			cellEl.addEventListener("dblclick", () => {
				this.onDayDblClick?.(year, month, day);
			});
		}

		cellEl.addEventListener("contextmenu", (event: MouseEvent) => {
			event.preventDefault();
			this.onDayContextMenu?.(year, month, day, event);
		});
	}

	getContainer(): HTMLElement {
		return this.containerEl;
	}

	getRowRefs(): RowRef[] {
		return this.rowRefs;
	}
}
