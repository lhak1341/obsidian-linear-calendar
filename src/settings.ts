import { App, PluginSettingTab, Setting, type ColorComponent } from "obsidian";
import type LinearCalendarPlugin from "./main";
import { COLOR_PALETTE } from "./constants";
import { buildTagColorMap } from "./utils/colorUtils";
import { FrontmatterScanner } from "./data/FrontmatterScanner";
import type { AlignMode, ColumnMapping, DailyNoteStyle } from "./types";

export class LinearCalendarSettingTab extends PluginSettingTab {
	plugin: LinearCalendarPlugin;

	constructor(app: App, plugin: LinearCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Linear Calendar Settings" });
		const mapping = this.plugin.settings.defaultMapping;
		this.renderGeneralSettings(containerEl, mapping);
		this.renderDailyNoteSettings(containerEl);
		this.renderColorMapSection(containerEl, mapping);
	}

	private renderGeneralSettings(containerEl: HTMLElement, mapping: ColumnMapping): void {
		new Setting(containerEl)
			.setName("Column alignment")
			.setDesc("Date: day 1 aligns across months. Weekday: same weekday aligns across months.")
			.addDropdown((dd) =>
				dd
					.addOption("date", "Date (1–31)")
					.addOption("weekday", "Weekday")
					.setValue(this.plugin.settings.alignMode)
					.onChange(async (value) => {
						this.plugin.settings.alignMode = value as AlignMode;
						await this.plugin.saveSettings();
					}),
			);

		const isFilename = mapping.titleProp === "__filename__";
		new Setting(containerEl)
			.setName("Title source")
			.setDesc("What to use as the bar label.")
			.addDropdown((dd) =>
				dd
					.addOption("__filename__", "Note title (filename)")
					.addOption("__custom__", "Frontmatter property")
					.setValue(isFilename ? "__filename__" : "__custom__")
					.onChange(async (value) => {
						mapping.titleProp = value === "__filename__" ? "__filename__" : "title";
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (!isFilename) {
			new Setting(containerEl)
				.setName("Title property name")
				.setDesc("Frontmatter key for bar labels.")
				.addText((text) =>
					text
						.setPlaceholder("title")
						.setValue(mapping.titleProp)
						.onChange(async (value) => {
							mapping.titleProp = value || "title";
							await this.plugin.saveSettings();
						}),
				);
		}

		new Setting(containerEl)
			.setName("Start date property")
			.setDesc("Frontmatter property for event start date.")
			.addText((text) =>
				text
					.setPlaceholder("datestart")
					.setValue(mapping.startDateProp)
					.onChange(async (value) => {
						mapping.startDateProp = value || "datestart";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("End date property")
			.setDesc("Frontmatter property for event end date. Events without this are single-day.")
			.addText((text) =>
				text
					.setPlaceholder("dateend")
					.setValue(mapping.endDateProp)
					.onChange(async (value) => {
						mapping.endDateProp = value || "dateend";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Icon property")
			.setDesc("Frontmatter property for Lucide icon name displayed on bars.")
			.addText((text) =>
				text
					.setPlaceholder("icon")
					.setValue(mapping.iconProp)
					.onChange(async (value) => {
						mapping.iconProp = value || "icon";
						await this.plugin.saveSettings();
					}),
			);
	}

	private renderDailyNoteSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h3", { text: "Daily Note Indicator" });

		const isCustomColor = this.plugin.settings.dailyNoteColor !== null;
		new Setting(containerEl)
			.setName("Highlight color")
			.setDesc("Color used to tint days that have a daily note.")
			.addDropdown((dd) =>
				dd
					.addOption("accent", "Accent color")
					.addOption("custom", "Custom color")
					.setValue(isCustomColor ? "custom" : "accent")
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteColor =
							value === "accent" ? null : (this.plugin.settings.dailyNoteColor ?? "#4a9eff");
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (isCustomColor) {
			new Setting(containerEl)
				.setName("Custom color")
				.addColorPicker((picker) =>
					picker
						.setValue(this.plugin.settings.dailyNoteColor ?? "#4a9eff")
						.onChange(async (value) => {
							this.plugin.settings.dailyNoteColor = value;
							await this.plugin.saveSettings();
						}),
				);
		}

		new Setting(containerEl)
			.setName("Indicator style")
			.setDesc("How to mark days that have a daily note.")
			.addDropdown((dd) =>
				dd
					.addOption("tint", "Background tint")
					.addOption("border-top", "Top edge line")
					.setValue(this.plugin.settings.dailyNoteStyle)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteStyle = value as DailyNoteStyle;
						await this.plugin.saveSettings();
					}),
			);
	}

	private renderColorMapSection(containerEl: HTMLElement, mapping: ColumnMapping): void {
		containerEl.createEl("h3", { text: "Tag Color Map" });
		containerEl.createEl("p", {
			text: 'Assign colors to linear-calendar subtags (e.g., "work", "personal"). Unmapped tags get auto-assigned from the palette.',
			cls: "setting-item-description",
		});

		const colorMap = this.plugin.settings.colorMap;
		this.renderPinnedTags(containerEl, colorMap);
		this.renderDetectedTags(containerEl, colorMap, mapping);
		this.renderAddColorMapping(containerEl, colorMap);
	}

	private renderPinnedTags(
		containerEl: HTMLElement,
		colorMap: Record<string, string>,
	): void {
		for (const [tag, color] of Object.entries(colorMap)) {
			const shortName = tag.replace(/^linear-calendar\//, "");
			new Setting(containerEl)
				.setName("")
				.then((setting) => {
					const nameEl = setting.nameEl;
					const dot = nameEl.createSpan({ cls: "lc-settings-dot" });
					dot.style.backgroundColor = color;
					nameEl.createSpan({ text: shortName });
					this.addSwatches(setting.controlEl, color, async (c) => {
						colorMap[tag] = c;
						await this.plugin.saveSettings();
						this.display();
					});
				})
				.addColorPicker((picker) =>
					picker.setValue(color).onChange(async (value) => {
						colorMap[tag] = value;
						await this.plugin.saveSettings();
						this.display();
					}),
				)
				.addExtraButton((btn) =>
					btn.setIcon("x").setTooltip("Remove").onClick(async () => {
						delete colorMap[tag];
						await this.plugin.saveSettings();
						this.display();
					}),
				);
		}
	}

	private renderDetectedTags(
		containerEl: HTMLElement,
		colorMap: Record<string, string>,
		mapping: ColumnMapping,
	): void {
		const scanner = new FrontmatterScanner(this.app);
		const items = scanner.scan(mapping, new Date().getFullYear());
		const autoMap = buildTagColorMap(items, this.plugin.settings);
		const unpinned = [...autoMap.entries()].filter(([tag]) => !(tag in colorMap));

		if (unpinned.length === 0) return;

		containerEl.createEl("h4", { text: "Detected tags" });
		containerEl.createEl("p", {
			text: "Auto-assigned colors from your notes. Pin to customize.",
			cls: "setting-item-description",
		});

		for (const [tag, color] of unpinned) {
			const shortName = tag === "__uncategorized__" ? "Other" : tag.replace(/^linear-calendar\//, "");
			new Setting(containerEl)
				.setName("")
				.then((setting) => {
					const nameEl = setting.nameEl;
					const dot = nameEl.createSpan({ cls: "lc-settings-dot" });
					dot.style.backgroundColor = color;
					nameEl.createSpan({ text: shortName });
				})
				.addExtraButton((btn) =>
					btn.setIcon("pin").setTooltip("Pin to color map").onClick(async () => {
						colorMap[tag] = color;
						await this.plugin.saveSettings();
						this.display();
					}),
				);
		}
	}

	private renderAddColorMapping(
		containerEl: HTMLElement,
		colorMap: Record<string, string>,
	): void {
		let newTagColor =
			COLOR_PALETTE.find((c) => !new Set(Object.values(colorMap)).has(c)) ?? COLOR_PALETTE[0];
		let newTagInput: HTMLInputElement;
		let newTagPicker: ColorComponent;

		const addSetting = new Setting(containerEl)
			.setName("Add tag color")
			.setDesc('Subtag name (without "linear-calendar/" prefix)');

		addSetting.addText((text) => {
			text.setPlaceholder("e.g. work");
			newTagInput = text.inputEl;
		});

		this.addSwatches(addSetting.controlEl, newTagColor, (c) => {
			newTagColor = c;
			if (newTagPicker) newTagPicker.setValue(c);
		});

		addSetting.addColorPicker((picker) => {
			newTagPicker = picker;
			picker.setValue(newTagColor).onChange((value) => { newTagColor = value; });
		});

		addSetting.addExtraButton((btn) =>
			btn.setIcon("plus").setTooltip("Add").onClick(async () => {
				const tagName = newTagInput?.value?.trim();
				if (!tagName) return;
				const fullTag = tagName.startsWith("linear-calendar/") ? tagName : `linear-calendar/${tagName}`;
				colorMap[fullTag] = newTagColor;
				await this.plugin.saveSettings();
				this.display();
			}),
		);
	}

	private addSwatches(
		parentEl: HTMLElement,
		activeColor: string,
		onSelect: (color: string) => void,
	): void {
		const wrap = parentEl.createDiv({ cls: "lc-color-swatches" });
		for (const color of COLOR_PALETTE) {
			const swatch = wrap.createDiv({ cls: "lc-color-swatch" });
			swatch.style.backgroundColor = color;
			if (color.toLowerCase() === activeColor.toLowerCase()) {
				swatch.addClass("is-active");
			}
			swatch.addEventListener("click", () => onSelect(color));
		}
	}
}
