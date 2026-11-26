/** Anything that notifies on change and hands back its unsubscribe (`DataSource`, `DailyNotes`, `SettingsChanges`). */
export interface ChangeSource {
	onChange(cb: () => void): () => void;
}

export interface RepaintSources {
	items: ChangeSource;
	dailyNotes: ChangeSource;
	settings: ChangeSource;
}

export interface Repaints {
	/** Rebuild the day grid, bars and chips. */
	full(): void;
	/** Rebuild bars and chips only, keeping the day-cell DOM. */
	bars(): void;
}

/**
 * How much of the calendar each outside change repaints. An item change repaints bars only: day
 * cells read daily notes and settings, never items. Daily notes and settings rebuild everything.
 * Returns one unsubscribe for all three.
 */
export function subscribeRepaints(sources: RepaintSources, repaint: Repaints): () => void {
	const unsubscribes = [
		sources.items.onChange(() => repaint.bars()),
		sources.dailyNotes.onChange(() => repaint.full()),
		sources.settings.onChange(() => repaint.full()),
	];
	return () => {
		for (const unsubscribe of unsubscribes) unsubscribe();
	};
}
