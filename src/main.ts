import { Plugin, WorkspaceLeaf } from "obsidian";
import type { CalendarItem, PluginSettings } from "./types";
import { DEFAULT_SETTINGS, VIEW_TYPE_LINEAR_CALENDAR } from "./constants";
import { LinearCalendarView } from "./view/LinearCalendarView";
import { LinearCalendarSettingTab } from "./settings";
import { FrontmatterScanner } from "./data/FrontmatterScanner";
import type { DataSource } from "./data/DataSource";
import { ObsidianEventNotes } from "./EventNotes";
import { DailyNotes } from "./DailyNotes";
import { SettingsChanges } from "./SettingsChanges";
import { CreateEventModal } from "./CreateEventModal";
import { MonthStrip } from "./view/MonthStrip";
import type { MonthStripHandle } from "./view/MonthStrip";
import { buildTagColorMap } from "./utils/colorUtils";
import { registerLucideIcons } from "./lucide-icons";

export type { MonthStripHandle };

export default class LinearCalendarPlugin extends Plugin {
	settings: PluginSettings = DEFAULT_SETTINGS;
	private scanner!: DataSource;
	private eventNotes!: ObsidianEventNotes;
	private dailyNotes!: DailyNotes;
	private settingsChanges = new SettingsChanges();

	async onload(): Promise<void> {
		registerLucideIcons();
		await this.loadSettings();
		this.scanner = new FrontmatterScanner(this.app, this);
		this.eventNotes = new ObsidianEventNotes(this.app, () => this.settings);
		this.dailyNotes = new DailyNotes(this.app, this);

		this.registerView(VIEW_TYPE_LINEAR_CALENDAR, (leaf: WorkspaceLeaf) => {
			return new LinearCalendarView(
				leaf,
				() => this.settings,
				this.scanner,
				this.dailyNotes,
				this.eventNotes,
				this.settingsChanges,
			);
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
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- loadData() returns unknown; shape is trusted plugin-authored settings JSON
		const saved: Partial<PluginSettings> = (await this.loadData()) ?? {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
		this.settings.defaultMapping = Object.assign(
			{},
			DEFAULT_SETTINGS.defaultMapping,
			saved.defaultMapping ?? {},
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.settingsChanges.notify();
	}

	/** Public API for other plugins — returns current-year items + resolved color map. */
	getCalendarData(year: number): { items: CalendarItem[]; colorMap: Map<string, string> } {
		const items = this.scanner.scan(this.settings.defaultMapping, year);
		const colorMap = buildTagColorMap(items, this.settings.colorMap);
		return { items, colorMap };
	}

	/**
	 * Public API — mount a full single-month calendar strip into `container`,
	 * starting on the current month. Uses LC's own renderers so styles, bars,
	 * tooltips, and the now-indicator all work exactly as in the full view.
	 * `onMonthChange` fires after every render (mount, navigation, data change,
	 * resize) with the displayed year/month, so a host view can render its own month label.
	 * Returns a handle to navigate months and to clean up when the host view closes.
	 */
	mountMonthStrip(
		container: HTMLElement,
		categoriesEl: HTMLElement,
		onMonthChange?: (year: number, month: number) => void,
	): MonthStripHandle {
		return new MonthStrip(
			{
				app: this.app,
				scanner: this.scanner,
				dailyNotes: this.dailyNotes,
				eventNotes: this.eventNotes,
				getSettings: () => this.settings,
				settingsChanges: this.settingsChanges,
			},
			container,
			categoriesEl,
			onMonthChange,
		);
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
