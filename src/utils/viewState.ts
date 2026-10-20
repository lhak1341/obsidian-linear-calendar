/** What `LinearCalendarView` persists across reloads (its `getState`/`setState` payload). */
export type ViewState = {
	year: number;
	/** Category keys; the set is rebuilt from this array at runtime. */
	hiddenCategories: string[];
	rowHeight: number;
	layout: "horizontal" | "vertical";
};

/** Years below 100 would be read by `new Date(year, …)` as 19xx. */
const MIN_YEAR = 1000;
const MAX_YEAR = 9999;
/** The density slider's range. */
const MAX_ROW_HEIGHT = 100;

/**
 * Applies a persisted payload over `fallback`, field by field: an invalid or missing field
 * keeps its fallback value and the valid ones still apply, so one bad field never loses the rest.
 */
export function restoreViewState(raw: unknown, fallback: ViewState): ViewState {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fallback;
	const s = raw as Partial<Record<keyof ViewState, unknown>>;

	return {
		year: typeof s.year === "number" && Number.isInteger(s.year) && s.year >= MIN_YEAR && s.year <= MAX_YEAR
			? s.year
			: fallback.year,
		hiddenCategories: Array.isArray(s.hiddenCategories)
			? s.hiddenCategories.filter((c): c is string => typeof c === "string")
			: fallback.hiddenCategories,
		rowHeight: typeof s.rowHeight === "number" && Number.isFinite(s.rowHeight)
			? Math.min(MAX_ROW_HEIGHT, Math.max(0, s.rowHeight))
			: fallback.rowHeight,
		layout: s.layout === "horizontal" || s.layout === "vertical" ? s.layout : fallback.layout,
	};
}
