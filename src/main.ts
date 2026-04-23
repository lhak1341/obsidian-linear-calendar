import { Plugin, WorkspaceLeaf } from "obsidian";
import type { PluginSettings } from "./types";
import { DEFAULT_SETTINGS, VIEW_TYPE_LINEAR_CALENDAR } from "./constants";
import { LinearCalendarView } from "./view/LinearCalendarView";
import { LinearCalendarSettingTab } from "./settings";

export default class LinearCalendarPlugin extends Plugin {
	settings: PluginSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_LINEAR_CALENDAR, (leaf: WorkspaceLeaf) => {
			return new LinearCalendarView(
				leaf,
				this.settings,
				() => this.settings.defaultMapping,
			);
		});

		this.addCommand({
			id: "open-linear-calendar",
			name: "Open Linear Calendar",
			callback: () => this.activateView(),
		});

		this.addSettingTab(new LinearCalendarSettingTab(this.app, this));
	}

	async onunload(): Promise<void> {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_LINEAR_CALENDAR);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		// Notify all open calendar views to re-render
		for (const leaf of this.app.workspace.getLeavesOfType(
			VIEW_TYPE_LINEAR_CALENDAR,
		)) {
			const view = leaf.view as LinearCalendarView;
			view.refresh();
		}
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_LINEAR_CALENDAR)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({
					type: VIEW_TYPE_LINEAR_CALENDAR,
					active: true,
				});
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
