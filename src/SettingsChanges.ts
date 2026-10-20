/**
 * Settings-save notifications for every calendar host (the full view and each mounted month
 * strip). Settings are mutated in place and saved through `LinearCalendarPlugin.saveSettings`,
 * which calls `notify()`; hosts repaint from `onChange`. Not debounced: saves are user-paced.
 */
export class SettingsChanges {
	private subscribers = new Set<() => void>();

	/** Calls `cb` after every settings save. Returns the unsubscribe. */
	onChange(cb: () => void): () => void {
		this.subscribers.add(cb);
		return () => { this.subscribers.delete(cb); };
	}

	notify(): void {
		for (const cb of [...this.subscribers]) cb();
	}
}
