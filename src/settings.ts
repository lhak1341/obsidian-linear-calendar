import { App, PluginSettingTab, Setting, setTooltip } from "obsidian";
import type { Hue } from "@lhak/style";
import type LinearCalendarPlugin from "./main";
import { HUE_ORDER, hueColour } from "./constants";
import { buildTagColorMap } from "./utils/colorUtils";
import { categoryLabel } from "./utils/category";
import { formatTagLabel } from "./utils/tagUtils";
import type { AlignMode, ColumnMapping, DailyNoteStyle } from "./types";
import { addFontRoleSetting, type FontRole } from "@lhak/style/obsidian-helpers";
import { IconField } from "./IconField";

export class LinearCalendarSettingTab extends PluginSettingTab {
	plugin: LinearCalendarPlugin;

	constructor(app: App, plugin: LinearCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Re-renders the settings tab. */
	private refresh(): void {
		this.renderAll();
	}

	display(): void {
		this.renderAll();
	}

	private renderAll(): void {
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
		const items = containerEl.createDiv("setting-group").createDiv("setting-items");

		new Setting(items)
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
		new Setting(items)
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
			new Setting(items)
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

		new Setting(items)
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

		new Setting(items)
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

		new Setting(items)
			.setName("Icon property")
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

		new Setting(items)
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

		new Setting(items)
			.setName("Reminder property")
			.setDesc("Frontmatter date property. When set, the note also shows a translucent ghost bar at that future date — click it to spin off a new note there.")
			.addText((text) =>
				text
					.setPlaceholder("Remindon")
					.setValue(mapping.remindProp)
					.onChange(async (value) => {
						mapping.remindProp = value || "remindon";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(items)
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
		const items = containerEl.createDiv("setting-group").createDiv("setting-items");

		new Setting(items)
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

		new Setting(items)
			.setName("Filename date format")
			.setDesc("Moment.js format for the date prefix in new event filenames.")
			.addText((text) =>
				text
					.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.newEventDateFormat)
					.onChange(async (value) => {
						this.plugin.settings.newEventDateFormat = value.trim() || "YYYY-MM-DD";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(items)
			.setName("Templater template")
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
		const items = containerEl.createDiv("setting-group").createDiv("setting-items");

		const isCustomColor = this.plugin.settings.dailyNoteColor !== null;
		new Setting(items)
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
			new Setting(items)
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

		new Setting(items)
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
		const items = containerEl.createDiv("setting-group").createDiv("setting-items");

		const fontRow = (role: FontRole, name: string, desc: string) => addFontRoleSetting(items, {
			role,
			name,
			desc,
			settings: this.plugin.settings,
			defaultLabel: "Calendar default (theme fonts)",
			onChange: () => void this.plugin.saveSettings(),
		});
		fontRow("heading", "Heading font", "Font for the year/month toolbar, event names and the tooltip title.");
		fontRow("body", "Body font", "Font for tooltip descriptions and other body text.");
		fontRow("mono", "Monospace font", "Font for numeric/data-style text.");

		new Setting(items)
			.setName("Japanese weekday labels")
			.setDesc("Show weekdays as single kanji characters (日/月/火/水/木/金/土)")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.japaneseWeekdayLabels)
					.onChange(async (value) => {
						this.plugin.settings.japaneseWeekdayLabels = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private renderColorMapSection(containerEl: HTMLElement, mapping: ColumnMapping): void {
		new Setting(containerEl).setName("Tag hues").setHeading();
		containerEl.createEl("p", {
			text: 'Assign one of the 8 theme hues to linear-calendar subtags (e.g., "work", "personal"). Unmapped tags take the hues in order. Hues repeat past 8 tags, so give tags icons to tell them apart.',
			cls: "setting-item-description",
		});

		const colorMap = this.plugin.settings.colorMap;
		this.renderPinnedTags(containerEl, colorMap);
		this.renderDetectedTags(containerEl, colorMap, mapping);
		this.renderAddColorMapping(containerEl, colorMap);
	}

	private renderPinnedTags(
		containerEl: HTMLElement,
		colorMap: Record<string, Hue>,
	): void {
		const entries = Object.entries(colorMap);
		if (entries.length === 0) return;

		const iconMap = this.plugin.settings.iconMap;
		const items = containerEl.createDiv("setting-group").createDiv("setting-items");
		for (const [tag, hue] of entries) {
			const shortName = formatTagLabel(tag);
			new Setting(items)
				.setName("")
				.then((setting) => {
					const nameEl = setting.nameEl;
					addHueDot(nameEl, hue);
					nameEl.createSpan({ text: shortName });
					this.addHuePicker(setting.controlEl, hue, (picked) => {
						colorMap[tag] = picked;
						void this.plugin.saveSettings();
						this.refresh();
					});
					new IconField(this.app, setting.controlEl, {
						initialValue: iconMap[tag],
						onCommit: (val) => {
							if (val) iconMap[tag] = val;
							else delete iconMap[tag];
							void this.plugin.saveSettings();
						},
					});
				})
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
		colorMap: Record<string, Hue>,
		mapping: ColumnMapping,
	): void {
		const { items } = this.plugin.getCalendarData(new Date().getFullYear());
		const autoMap = buildTagColorMap(items, this.plugin.settings.colorMap);
		const unpinned = [...autoMap.entries()].filter(([tag]) => !(tag in colorMap));

		if (unpinned.length === 0) return;

		new Setting(containerEl).setName("Detected tags").setHeading();
		containerEl.createEl("p", {
			text: "Tags from your notes with their automatic hue. Pin one to choose its hue.",
			cls: "setting-item-description",
		});
		const detectedItems = containerEl.createDiv("setting-group").createDiv("setting-items");

		for (const [tag, hue] of unpinned) {
			const shortName = categoryLabel(tag);
			new Setting(detectedItems)
				.setName("")
				.then((setting) => {
					const nameEl = setting.nameEl;
					addHueDot(nameEl, hue);
					nameEl.createSpan({ text: shortName });
				})
				.addExtraButton((btn) =>
					btn.setIcon("pin").setTooltip("Pin to tag hues").onClick(async () => {
						colorMap[tag] = hue;
						await this.plugin.saveSettings();
						this.refresh();
					}),
				);
		}
	}

	private renderAddColorMapping(
		containerEl: HTMLElement,
		colorMap: Record<string, Hue>,
	): void {
		const iconMap = this.plugin.settings.iconMap;
		const used = new Set(Object.values(colorMap));
		let newTagHue: Hue = HUE_ORDER.find((h) => !used.has(h)) ?? HUE_ORDER[0];
		let newTagInput: HTMLInputElement;
		let newIconValue = "";

		const items = containerEl.createDiv("setting-group").createDiv("setting-items");
		const addSetting = new Setting(items)
			.setName("Add tag hue")
			.setDesc('Subtag name (without "linear-calendar/" prefix)')
			.then((setting) => setting.settingEl.addClass("lc-add-tag-color"));

		addSetting.addText((text) => {
			text.setPlaceholder("E.g. work");
			newTagInput = text.inputEl;
		});

		this.addHuePicker(addSetting.controlEl, newTagHue, (picked) => { newTagHue = picked; });

		addSetting.then((setting) => {
			new IconField(this.app, setting.controlEl, {
				placeholder: "Icon (optional)",
				onPreview: (val) => { newIconValue = val; },
			});
		});

		addSetting.addExtraButton((btn) =>
			btn.setIcon("plus").setTooltip("Add").onClick(async () => {
				const tagName = newTagInput?.value?.trim();
				if (!tagName) return;
				const fullTag = tagName.startsWith("linear-calendar/") ? tagName : `linear-calendar/${tagName}`;
				colorMap[fullTag] = newTagHue;
				if (newIconValue) iconMap[fullTag] = newIconValue;
				await this.plugin.saveSettings();
				this.refresh();
			}),
		);
	}

	/**
	 * The hue picker: one swatch button per contract hue, named by its hue, the chosen one
	 * pressed. The settings tab sits outside every root, so the row carries `lk-root` to
	 * read the hues from the contract.
	 */
	private addHuePicker(parentEl: HTMLElement, active: Hue, onSelect: (hue: Hue) => void): void {
		const wrap = parentEl.createDiv({ cls: "lc-hue-swatches lk-root", attr: { role: "group", "aria-label": "Hue" } });
		const swatches = HUE_ORDER.map((hue) => {
			const swatch = wrap.createEl("button", {
				cls: "lc-hue-swatch",
				attr: { type: "button", "aria-label": hue, "aria-pressed": String(hue === active) },
			});
			swatch.style.setProperty("--lc-hue", hueColour(hue));
			setTooltip(swatch, hue);
			swatch.addEventListener("click", () => {
				for (const s of swatches) s.setAttribute("aria-pressed", String(s === swatch));
				onSelect(hue);
			});
			return swatch;
		});
	}
}

/** A tag's hue as a dot before its name (with `lk-root`: the settings tab has no root). */
function addHueDot(parentEl: HTMLElement, hue: Hue): void {
	parentEl.createSpan({ cls: "lc-settings-dot lk-root" }).style.setProperty("--lc-hue", hueColour(hue));
}
