import { Plugin, WorkspaceLeaf } from "obsidian";
import type { CalendarItem, PluginSettings, TagHue } from "./types";
import { DEFAULT_SETTINGS, VIEW_TYPE_LINEAR_CALENDAR } from "./constants";
import { LinearCalendarView } from "./view/LinearCalendarView";
import { LinearCalendarSettingTab } from "./settings";
import { FrontmatterScanner } from "./data/FrontmatterScanner";
import type { DataSource } from "./data/DataSource";
import { ObsidianEventNotes } from "./EventNotes";
import { DailyNotes } from "./DailyNotes";
import { SettingsChanges } from "./SettingsChanges";
import { CreateEventModal } from "./CreateEventModal";
import { RollingStrip } from "./view/RollingStrip";
import type { CalendarDeps } from "./view/CalendarRenderer";
import type { RollingStripHandle } from "./view/RollingStrip";
import { buildTagColorMap } from "./utils/colorUtils";
import { registerLucideIcons } from "./lucide-icons";
import { loadSettingsFrom } from "./savedSettings";

export type { RollingStripHandle };

export default class LinearCalendarPlugin extends Plugin {
	settings: PluginSettings = DEFAULT_SETTINGS;
	private scanner!: DataSource;
	private eventNotes!: ObsidianEventNotes;
	private dailyNotes!: DailyNotes;
	private settingsChanges = new SettingsChanges();

	async onload(): Promise<void> {
		registerLucideIcons();
		await this.loadSettings();
		this.scanner = new FrontmatterScanner(this.app, this, () => this.settings.defaultMapping);
		this.eventNotes = new ObsidianEventNotes(this.app, () => this.settings);
		this.dailyNotes = new DailyNotes(this.app, this);

		this.registerView(VIEW_TYPE_LINEAR_CALENDAR, (leaf: WorkspaceLeaf) => {
			return new LinearCalendarView(leaf, this.calendarDeps());
		});

		this.addCommand({
			id: "open-linear-calendar",
			name: "Open",
			callback: () => this.activateView(),
		});

		this.addCommand({
			id: "create-event",
			name: "Create event",
			callback: () => new CreateEventModal(this.app, this.eventNotes, this.settings).open(),
		});

		this.addSettingTab(new LinearCalendarSettingTab(this.app, this));
	}

	onunload(): void {

	}

	async loadSettings(): Promise<void> {
		this.settings = await loadSettingsFrom(this);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.settingsChanges.notify();
	}

	/**
	 * Public API for other plugins — the items touching `year` (each with its own span, not cut to
	 * the year) + each tag's resolved hue name.
	 */
	getCalendarData(year: number): { items: CalendarItem[]; colorMap: Map<string, TagHue> } {
		const items = this.scanner.items(new Date(year, 0, 1), new Date(year, 11, 31));
		const colorMap = buildTagColorMap(items, this.settings.colorMap);
		return { items, colorMap };
	}

	/**
	 * Public API — mount a rolling calendar strip into `container`
	 * of the next 30 days, starting today. Uses LC's own renderers so styles, bars,
	 * tooltips, and the now-indicator all work exactly as in the full view.
	 * `onRangeChange` fires after every full render (mount, paging, midnight, resize, a daily-note
	 * or settings change; not an item change or category toggle, which repaint bars only) with the
	 * first and last day shown, so a host view can render its own range label.
	 * Returns a handle to page the window and to clean up when the host view closes.
	 */
	mountRollingStrip(
		container: HTMLElement,
		categoriesEl: HTMLElement,
		onRangeChange?: (start: Date, end: Date) => void,
	): RollingStripHandle {
		return new RollingStrip(this.calendarDeps(), container, categoriesEl, onRangeChange);
	}

	/** What every calendar host shares; built per host, after `onload` has made the collaborators. */
	private calendarDeps(): CalendarDeps {
		return {
			app: this.app,
			source: this.scanner,
			dailyNotes: this.dailyNotes,
			eventNotes: this.eventNotes,
			getSettings: () => this.settings,
			settingsChanges: this.settingsChanges,
		};
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_LINEAR_CALENDAR)[0];
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({
				type: VIEW_TYPE_LINEAR_CALENDAR,
				active: true,
			});
		}

		if (leaf) {
			await workspace.revealLeaf(leaf);
		}
	}
}
