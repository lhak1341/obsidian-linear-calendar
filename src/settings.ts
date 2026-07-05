import { App, PluginSettingTab, Setting, setIcon, type ColorComponent } from "obsidian";
import type LinearCalendarPlugin from "./main";
import { COLOR_PALETTE } from "./constants";
import { buildTagColorMap } from "./utils/colorUtils";
import type { AlignMode, ColumnMapping, DailyNoteStyle, FontChoice } from "./types";

const FONT_OPTIONS: Record<FontChoice, string> = {
	"plugin":             "Plugin default",
	"obsidian-interface": "Obsidian: Interface font",
	"obsidian-text":      "Obsidian: Text font",
	"obsidian-monospace": "Obsidian: Monospace font",
	"custom":             "Custom…",
};

export class LinearCalendarSettingTab extends PluginSettingTab {
	plugin: LinearCalendarPlugin;

	constructor(app: App, plugin: LinearCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Re-renders the settings tab. Wraps the deprecated display() in one place. */
	private refresh(): void {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.display();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const mapping = this.plugin.settings.defaultMapping;
		this.renderGeneralSettings(containerEl, mapping);
		this.renderAppearanceSettings(containerEl);
		this.renderDailyNoteSettings(containerEl);
		this.renderColorMapSection(containerEl, mapping);
		this.renderNewEventSettings(containerEl);
	}

	private renderGeneralSettings(containerEl: HTMLElement, mapping: ColumnMapping): void {
		new Setting(containerEl).setName("Data mapping").setHeading();

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
						this.refresh();
					}),
			);

		if (!isFilename) {
			new Setting(containerEl)
				.setName("Title property name")
				.setDesc("Frontmatter key for bar labels.")
				.addText((text) =>
					text
						.setPlaceholder("Title")
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
					// eslint-disable-next-line obsidianmd/ui/sentence-case
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
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setPlaceholder("dateend")
					.setValue(mapping.endDateProp)
					.onChange(async (value) => {
						mapping.endDateProp = value || "dateend";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Icon property")
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setDesc("Frontmatter property for Lucide icon name displayed on bars.")
			.addText((text) =>
				text
					.setPlaceholder("Icon")
					.setValue(mapping.iconProp)
					.onChange(async (value) => {
						mapping.iconProp = value || "icon";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Anniversary property")
			.setDesc("Frontmatter boolean property. When true, the event repeats on the same date every subsequent year (shown with a dashed border).")
			.addText((text) =>
				text
					.setPlaceholder("Anniversary")
					.setValue(mapping.anniversaryProp)
					.onChange(async (value) => {
						mapping.anniversaryProp = value || "anniversary";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Description property")
			.setDesc("Frontmatter property shown as a third line in the hover tooltip. Leave empty to hide.")
			.addText((text) =>
				text
					.setPlaceholder("description")
					.setValue(mapping.descriptionProp)
					.onChange(async (value) => {
						mapping.descriptionProp = value.trim();
						await this.plugin.saveSettings();
					}),
			);
	}

	private renderNewEventSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("New event").setHeading();

		new Setting(containerEl)
			.setName("New event folder")
			.setDesc("Folder where new events are created via right-click. Leave empty to use vault root.")
			.addText((text) =>
				text
					.setPlaceholder("E.g. Events")
					.setValue(this.plugin.settings.newEventFolder)
					.onChange(async (value) => {
						this.plugin.settings.newEventFolder = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Filename date format")
			.setDesc("Moment.js format for the date prefix in new event filenames.")
			.addText((text) =>
				text
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.newEventDateFormat)
					.onChange(async (value) => {
						this.plugin.settings.newEventDateFormat = value.trim() || "YYYY-MM-DD";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Templater template")
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setDesc("Path to a Templater template file to apply when creating new events. Leave empty to use plain frontmatter. Requires the Templater plugin.")
			.addText((text) =>
				text
					.setPlaceholder("e.g. Templates/Event.md")
					.setValue(this.plugin.settings.newEventTemplate)
					.onChange(async (value) => {
						this.plugin.settings.newEventTemplate = value.trim();
						await this.plugin.saveSettings();
					}),
			);
	}

	private renderDailyNoteSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Daily notes").setHeading();

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
						this.refresh();
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

	private renderAppearanceSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Appearance").setHeading();

		let customFontEl: Setting;
		new Setting(containerEl)
			.setName("Font")
			.setDesc("Font family for the calendar UI.")
			.addDropdown((drop) => {
				Object.entries(FONT_OPTIONS).forEach(([v, label]) => { drop.addOption(v, label); });
				drop.setValue(this.plugin.settings.font).onChange((value) => {
					this.plugin.settings.font = value as FontChoice;
					customFontEl.settingEl.style.display = value === "custom" ? "" : "none";
					void this.plugin.saveSettings();
				});
			});
		customFontEl = new Setting(containerEl)
			.setName("")
			.addText((text) =>
				text
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setPlaceholder('e.g. Inter, "DM Sans"')
					.setValue(this.plugin.settings.fontCustom)
					.onChange((value) => {
						this.plugin.settings.fontCustom = value.trim();
						void this.plugin.saveSettings();
					}),
			);
		customFontEl.settingEl.style.display = this.plugin.settings.font === "custom" ? "" : "none";
	}

	private renderColorMapSection(containerEl: HTMLElement, mapping: ColumnMapping): void {
		new Setting(containerEl).setName("Tag color map").setHeading();
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
		const iconMap = this.plugin.settings.iconMap;
		for (const [tag, color] of Object.entries(colorMap)) {
			const shortName = tag.replace(/^linear-calendar\//, "");
			new Setting(containerEl)
				.setName("")
				.then((setting) => {
					const nameEl = setting.nameEl;
					const dot = nameEl.createSpan({ cls: "lc-settings-dot" });
					dot.style.backgroundColor = color;
					nameEl.createSpan({ text: shortName });
					this.addSwatches(setting.controlEl, color, (c) => {
						colorMap[tag] = c;
						void this.plugin.saveSettings();
						this.refresh();
					});
					const iconWrap = setting.controlEl.createSpan({ cls: "lc-icon-input-wrap" });
					const iconInput = iconWrap.createEl("input", {
						cls: "lc-icon-input",
						attr: { type: "text", placeholder: "Icon name", value: iconMap[tag] ?? "" },
					});
					const iconPreview = iconWrap.createSpan({ cls: "lc-icon-preview" });
					if (iconMap[tag]) setIcon(iconPreview, iconMap[tag]);
					iconInput.addEventListener("input", () => {
						iconPreview.empty();
						const val = iconInput.value.trim();
						if (val) setIcon(iconPreview, val);
					});
					iconInput.addEventListener("change", () => {
						const val = iconInput.value.trim();
						if (val) iconMap[tag] = val;
						else delete iconMap[tag];
						void this.plugin.saveSettings();
					});
				})
				.addColorPicker((picker) =>
					picker.setValue(color).onChange((value) => {
						colorMap[tag] = value;
						void this.plugin.saveSettings();
						this.refresh();
					}),
				)
				.addExtraButton((btn) =>
					btn.setIcon("x").setTooltip("Remove").onClick(async () => {
						delete colorMap[tag];
						delete iconMap[tag];
						await this.plugin.saveSettings();
						this.refresh();
					}),
				);
		}
	}

	private renderDetectedTags(
		containerEl: HTMLElement,
		colorMap: Record<string, string>,
		mapping: ColumnMapping,
	): void {
		const { items } = this.plugin.getCalendarData(new Date().getFullYear());
		const autoMap = buildTagColorMap(items, this.plugin.settings.colorMap);
		const unpinned = [...autoMap.entries()].filter(([tag]) => !(tag in colorMap));

		if (unpinned.length === 0) return;

		new Setting(containerEl).setName("Detected tags").setHeading();
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
						this.refresh();
					}),
				);
		}
	}

	private renderAddColorMapping(
		containerEl: HTMLElement,
		colorMap: Record<string, string>,
	): void {
		const iconMap = this.plugin.settings.iconMap;
		let newTagColor =
			COLOR_PALETTE.find((c) => !new Set(Object.values(colorMap)).has(c)) ?? COLOR_PALETTE[0];
		let newTagInput: HTMLInputElement;
		let newTagPicker: ColorComponent;
		let newIconValue = "";

		const addSetting = new Setting(containerEl)
			.setName("Add tag color")
			.setDesc('Subtag name (without "linear-calendar/" prefix)');

		addSetting.addText((text) => {
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			text.setPlaceholder("e.g. work");
			newTagInput = text.inputEl;
		});

		this.addSwatches(addSetting.controlEl, newTagColor, (c) => {
			newTagColor = c;
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			if (newTagPicker) newTagPicker.setValue(c);
		});

		addSetting.addColorPicker((picker) => {
			newTagPicker = picker;
			picker.setValue(newTagColor).onChange((value) => { newTagColor = value; });
		});

		addSetting.then((setting) => {
			const iconWrap = setting.controlEl.createSpan({ cls: "lc-icon-input-wrap" });
			const iconInput = iconWrap.createEl("input", {
				cls: "lc-icon-input",
				attr: { type: "text", placeholder: "Icon (optional)" },
			});
			const iconPreview = iconWrap.createSpan({ cls: "lc-icon-preview" });
			iconInput.addEventListener("input", () => {
				iconPreview.empty();
				const val = iconInput.value.trim();
				if (val) setIcon(iconPreview, val);
				newIconValue = val;
			});
		});

		addSetting.addExtraButton((btn) =>
			btn.setIcon("plus").setTooltip("Add").onClick(async () => {
				const tagName = newTagInput?.value?.trim();
				if (!tagName) return;
				const fullTag = tagName.startsWith("linear-calendar/") ? tagName : `linear-calendar/${tagName}`;
				colorMap[fullTag] = newTagColor;
				if (newIconValue) iconMap[fullTag] = newIconValue;
				await this.plugin.saveSettings();
				this.refresh();
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
