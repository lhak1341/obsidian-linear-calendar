import { App, PluginSettingTab, Setting, setIcon, setTooltip } from "obsidian";
import type LinearCalendarPlugin from "./main";
import { HUE_ORDER, TAG_HUES, hueColour } from "./constants";
import { buildTagColorMap, rgbToHex } from "./utils/colorUtils";
import { categoryLabel } from "./utils/category";
import { subtagFromInput, tagChips, type TagChip } from "./utils/tagChips";
import type { AlignMode, ColumnMapping, DailyNoteStyle, TagHue } from "./types";
import { addFontRoleSetting, type FontRole } from "@lhak/style/obsidian-helpers";
import { IconField } from "./IconField";
import { ListSuggest } from "./ListSuggest";
import { TagPopover } from "./TagPopover";
import { readVaultNames, type VaultNames } from "./vaultNames";
import { resolveLucideIconId } from "./lucide-icons";
import { datePrefix } from "./utils/eventNotePath";

type AppWithPlugins = App & { plugins?: { enabledPlugins?: Set<string> } };

/** The frontmatter keys the calendar reads, with the default each falls back to when empty. */
const PROPERTY_FIELDS: { key: Exclude<keyof ColumnMapping, "titleProp" | "descriptionProp">; name: string; desc: string; fallback: string }[] = [
	{ key: "startDateProp", name: "Start date", desc: "The day an event starts.", fallback: "datestart" },
	{ key: "endDateProp", name: "End date", desc: "The day it ends. Events without one last a single day.", fallback: "dateend" },
	{ key: "iconProp", name: "Icon", desc: "A Lucide icon name, drawn on the bar.", fallback: "icon" },
	{ key: "anniversaryProp", name: "Anniversary", desc: "When true, the event repeats on its date every year, drawn with a dashed border.", fallback: "anniversary" },
	{ key: "remindProp", name: "Reminder", desc: "A later date. The note shows a ghost bar there; click it to start a new note on that day.", fallback: "remindon" },
];

export class LinearCalendarSettingTab extends PluginSettingTab {
	plugin: LinearCalendarPlugin;
	/** The open tag editor, closed on every re-render and when the tab hides. */
	private popover: TagPopover | null = null;

	constructor(app: App, plugin: LinearCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Re-renders the settings tab where the user is. `renderAll` empties the tab first, which
	 * collapses its scroll container and clamps its scroll to the top, so the scroll position
	 * is read before and restored after.
	 */
	private refresh(): void {
		const scroller = scrollingAncestor(this.containerEl);
		const top = scroller?.scrollTop ?? 0;
		this.renderAll();
		if (scroller) scroller.scrollTop = top;
	}

	display(): void {
		this.renderAll();
	}

	hide(): void {
		this.popover?.close();
	}

	private async save(): Promise<void> {
		await this.plugin.saveSettings();
	}

	/** Sections in the order they are used: tags most, then looks, then once-set options. */
	private renderAll(): void {
		this.popover?.close();
		const { containerEl } = this;
		containerEl.empty();
		const names = readVaultNames(this.app);
		this.renderTagSection(containerEl, names);
		this.renderAppearanceSettings(containerEl);
		this.renderDailyNoteSettings(containerEl);
		this.renderNewEventSettings(containerEl, names);
		this.renderPropertySettings(containerEl, names);
	}

	// ---- Tag hues ----

	private renderTagSection(containerEl: HTMLElement, names: VaultNames): void {
		new Setting(containerEl).setName("Tag hues").setHeading();
		containerEl.createEl("p", {
			text: "Click a tag to choose its hue and icon. Outlined tags take the next hue in order.",
			cls: "setting-item-description",
		});

		const { colorMap, iconMap } = this.plugin.settings;
		const { items } = this.plugin.getCalendarData(new Date().getFullYear());
		const chips = tagChips(buildTagColorMap(items, colorMap), colorMap, iconMap, names.calendarTags);

		const wrap = containerEl.createDiv("setting-group").createDiv("setting-items lc-tag-chips");
		for (const chip of chips) {
			const button = this.tagChipButton(wrap, chip);
			button.addEventListener("click", () => this.openTagEditor(chip, button));
		}
		const add = wrap.createEl("button", { cls: "lc-tag-chip-add", attr: { "aria-haspopup": "dialog", "aria-expanded": "false" } });
		setIcon(add.createSpan("lc-tag-chip-icon"), "plus");
		add.createSpan({ text: "Add tag" });
		add.addEventListener("click", () => this.openAddTag(add, names));
	}

	/** A tag drawn as its bar: filled with a chosen hue, outlined in its automatic one. */
	private tagChipButton(parent: HTMLElement, chip: TagChip): HTMLButtonElement {
		const label = categoryLabel(chip.tag);
		const button = parent.createEl("button", {
			cls: chip.chosen ? "lc-tag-chip lk-root" : "lc-tag-chip lk-root is-auto",
			attr: {
				"aria-haspopup": "dialog",
				"aria-expanded": "false",
				"aria-label": `${label}: ${chip.chosen ? `${chip.hue}` : "automatic hue"}`,
			},
		});
		if (chip.hue) button.style.setProperty("--lc-hue", hueColour(chip.hue));
		const icon = this.plugin.settings.iconMap[chip.tag];
		if (icon) setIcon(button.createSpan("lc-tag-chip-icon"), resolveLucideIconId(icon));
		button.createSpan({ text: label });
		return button;
	}

	/** Opens an editor under `anchor`; null when `anchor`'s editor was open, which it closes. */
	private openPopover(anchor: HTMLElement, label: string): TagPopover | null {
		const reopened = this.popover?.isFor(anchor) ?? false;
		this.popover?.close();
		if (reopened) return null;
		const popover = new TagPopover(anchor, label, () => {
			if (this.popover === popover) this.popover = null;
		});
		this.popover = popover;
		return popover;
	}

	/** One tag's editor: Auto or one of the 9 hues, its icon, and Remove when no note uses it. */
	private openTagEditor(chip: TagChip, anchor: HTMLElement): void {
		const { colorMap, iconMap } = this.plugin.settings;
		const label = categoryLabel(chip.tag);
		const popover = this.openPopover(anchor, `${label}: hue and icon`);
		if (!popover) return;
		popover.el.createDiv({ cls: "lc-tag-popover-title", text: label });

		addHueRow(popover.el, chip.chosen ? chip.hue : null, true, (hue) => {
			if (hue) colorMap[chip.tag] = hue;
			else delete colorMap[chip.tag];
			void this.save().then(() => this.refresh());
		});

		new IconField(this.app, popover.el, {
			initialValue: iconMap[chip.tag],
			placeholder: "Icon",
			onCommit: (value) => {
				if (value) iconMap[chip.tag] = value;
				else delete iconMap[chip.tag];
				void this.save().then(() => this.refresh());
			},
		});

		if (!chip.inNotes) {
			popover.el.createDiv({ cls: "setting-item-description", text: "No note uses this tag, so removing its hue and icon removes it from this list." });
			const remove = popover.el.createEl("button", { cls: "mod-warning", text: "Remove" });
			remove.addEventListener("click", () => {
				delete colorMap[chip.tag];
				delete iconMap[chip.tag];
				void this.save().then(() => this.refresh());
			});
		}
		popover.focusFirst();
	}

	/** The add editor: a subtag name, warned when no note uses it, and its first hue. */
	private openAddTag(anchor: HTMLElement, names: VaultNames): void {
		const { colorMap } = this.plugin.settings;
		const popover = this.openPopover(anchor, "Add tag");
		if (!popover) return;
		const input = popover.el.createEl("input", { type: "text", attr: { placeholder: "Subtag, such as work", "aria-label": "Subtag" } });
		const warning = popover.el.createDiv("setting-item-description lc-setting-warning");
		const used = new Set(Object.values(colorMap));
		let hue: TagHue = HUE_ORDER.find((h) => !used.has(h)) ?? HUE_ORDER[0];
		addHueRow(popover.el, hue, false, (picked) => { if (picked) hue = picked; });
		const add = popover.el.createEl("button", { cls: "mod-cta", text: "Add" });

		input.addEventListener("input", () => {
			const tag = subtagFromInput(input.value);
			warning.setText(tag && !names.calendarTags.has(tag) ? `No note uses #${tag} yet.` : "");
		});
		const submit = () => {
			if (!input.value.trim()) return;
			const tag = subtagFromInput(input.value);
			if (!tag) {
				warning.setText("A tag name cannot contain spaces.");
				return;
			}
			colorMap[tag] = hue;
			void this.save().then(() => this.refresh());
		};
		add.addEventListener("click", submit);
		input.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") submit();
		});
		popover.focusFirst();
	}

	// ---- Appearance ----

	private renderAppearanceSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Appearance").setHeading();
		const items = containerEl.createDiv("setting-group").createDiv("setting-items");

		new Setting(items)
			.setName("Column alignment")
			.setDesc("Line months up by date (day 1 under day 1) or by weekday.")
			.addDropdown((dd) =>
				dd
					.addOption("date", "Date (1–31)")
					.addOption("weekday", "Weekday")
					.setValue(this.plugin.settings.alignMode)
					.onChange(async (value) => {
						this.plugin.settings.alignMode = value as AlignMode;
						await this.save();
					}),
			);

		const fontRow = (role: FontRole, name: string, desc: string) => addFontRoleSetting(items, {
			role,
			name,
			desc,
			settings: this.plugin.settings,
			defaultLabel: "Calendar default (theme fonts)",
			onChange: () => void this.save(),
		});
		fontRow("heading", "Heading font", "The toolbar, event names on bars and the tooltip title.");
		fontRow("body", "Body font", "Tooltip descriptions.");
		fontRow("mono", "Monospace font", "Not used by the calendar yet.");

		new Setting(items)
			.setName("Japanese weekday labels")
			.setDesc("Show weekdays as single kanji (日 月 火 水 木 金 土).")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.japaneseWeekdayLabels)
					.onChange(async (value) => {
						this.plugin.settings.japaneseWeekdayLabels = value;
						await this.save();
					}),
			);
	}

	// ---- Daily notes ----

	private renderDailyNoteSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Daily notes").setHeading();
		const items = containerEl.createDiv("setting-group").createDiv("setting-items");

		const custom = this.plugin.settings.dailyNoteColor;
		const colour = new Setting(items)
			.setName("Highlight colour")
			.setDesc(custom ? "Marks days that have a daily note. Custom colour." : "Marks days that have a daily note. Follows the accent colour.");
		if (custom) {
			colour.addExtraButton((btn) =>
				btn.setIcon("rotate-ccw").setTooltip("Use the accent colour").onClick(async () => {
					this.plugin.settings.dailyNoteColor = null;
					await this.save();
					this.refresh();
				}),
			);
		}
		colour.addColorPicker((picker) =>
			picker
				.setValue(custom ?? this.accentHex() ?? "#7f6df2")
				.onChange(async (value) => {
					const wasAccent = this.plugin.settings.dailyNoteColor === null;
					this.plugin.settings.dailyNoteColor = value;
					await this.save();
					if (wasAccent) this.refresh();
				}),
		);

		new Setting(items)
			.setName("Indicator style")
			.setDesc("How a day with a daily note is marked.")
			.addDropdown((dd) =>
				dd
					.addOption("tint", "Background tint")
					.addOption("border-top", "Top edge line")
					.setValue(this.plugin.settings.dailyNoteStyle)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteStyle = value as DailyNoteStyle;
						await this.save();
					}),
			);
	}

	/** The theme's accent as `#rrggbb`, so the colour picker can start from it. */
	private accentHex(): string | null {
		const probe = this.containerEl.createDiv();
		probe.setCssProps({ color: "var(--interactive-accent)" });
		const rgb = getComputedStyle(probe).color;
		probe.remove();
		return rgbToHex(rgb);
	}

	// ---- New event ----

	private renderNewEventSettings(containerEl: HTMLElement, names: VaultNames): void {
		new Setting(containerEl).setName("New event").setHeading();
		const items = containerEl.createDiv("setting-group").createDiv("setting-items");
		const settings = this.plugin.settings;

		new Setting(items)
			.setName("Folder")
			.setDesc("Where right-click creates new event notes. Empty means the vault root.")
			.addText((text) => {
				text
					.setPlaceholder("Events")
					.setValue(settings.newEventFolder)
					.onChange(async (value) => {
						settings.newEventFolder = value.trim();
						await this.save();
					});
				text.inputEl.addClass("lc-path-input");
				new ListSuggest(this.app, text.inputEl, () => names.folders);
			});

		const format = new Setting(items).setName("Filename date format");
		format.descEl.appendText("Moment.js format for the date prefix. New notes start with ");
		const preview = format.descEl.createSpan({ cls: "lc-format-preview" });
		const showPreview = (format: string) => preview.setText(datePrefix(new Date(), { folder: "", format }));
		showPreview(settings.newEventDateFormat);
		format.addText((text) =>
			text
				.setPlaceholder("YYYY-MM-DD")
				.setValue(settings.newEventDateFormat)
				.onChange(async (value) => {
					settings.newEventDateFormat = value.trim() || "YYYY-MM-DD";
					showPreview(value.trim());
					await this.save();
				}),
		);

		const template = new Setting(items)
			.setName("Template")
			.setDesc("Applied with Templater when a new event note is created. Empty means plain frontmatter.");
		const warning = template.descEl.createDiv("lc-setting-warning");
		const templater = (this.app as AppWithPlugins).plugins?.enabledPlugins?.has("templater-obsidian") ?? false;
		const checkTemplate = (path: string) => {
			if (!path) warning.setText("");
			else if (!templater) warning.setText("Templater is off, so new notes skip the template.");
			else warning.setText(names.files.includes(path) ? "" : `No file at ${path}.`);
		};
		checkTemplate(settings.newEventTemplate);
		template.addText((text) => {
			text
				.setPlaceholder("Templates/Event.md")
				.setValue(settings.newEventTemplate)
				.onChange(async (value) => {
					settings.newEventTemplate = value.trim();
					checkTemplate(settings.newEventTemplate);
					await this.save();
				});
			text.inputEl.addClass("lc-path-input");
			new ListSuggest(this.app, text.inputEl, () => names.files);
		});
	}

	// ---- Frontmatter properties ----

	private renderPropertySettings(containerEl: HTMLElement, names: VaultNames): void {
		new Setting(containerEl).setName("Frontmatter properties").setHeading();
		containerEl.createEl("p", {
			text: "Which note properties the calendar reads. An empty field reads the default shown in grey.",
			cls: "setting-item-description",
		});
		const items = containerEl.createDiv("setting-group").createDiv("setting-items");
		const mapping = this.plugin.settings.defaultMapping;

		const isFilename = mapping.titleProp === "__filename__";
		const title = new Setting(items)
			.setName("Bar label")
			.setDesc(isFilename ? "The note's file name." : "A property of the note.")
			.addDropdown((dd) =>
				dd
					.addOption("file", "File name")
					.addOption("property", "Property")
					.setValue(isFilename ? "file" : "property")
					.onChange(async (value) => {
						mapping.titleProp = value === "file" ? "__filename__" : "title";
						await this.save();
						this.refresh();
					}),
			);
		if (!isFilename) {
			this.addPropertyInput(title, names, mapping.titleProp, "title", (value) => { mapping.titleProp = value || "title"; });
		}

		for (const field of PROPERTY_FIELDS) {
			const setting = new Setting(items).setName(field.name).setDesc(field.desc);
			this.addPropertyInput(setting, names, mapping[field.key], field.fallback, (value) => { mapping[field.key] = value || field.fallback; });
		}

		const description = new Setting(items).setName("Description").setDesc("The tooltip's third line. Empty hides it.");
		this.addPropertyInput(description, names, mapping.descriptionProp, "none", (value) => { mapping.descriptionProp = value; });
	}

	/** A property-name field: suggests the vault's keys and warns about a key no note has. */
	private addPropertyInput(
		setting: Setting,
		names: VaultNames,
		value: string,
		placeholder: string,
		apply: (value: string) => void,
	): void {
		const warning = setting.descEl.createDiv("lc-setting-warning");
		const check = (key: string) => warning.setText(key && !names.properties.includes(key) ? `No note has a "${key}" property yet.` : "");
		check(value);
		setting.addText((text) => {
			text
				.setPlaceholder(placeholder)
				.setValue(value)
				.onChange(async (typed) => {
					const key = typed.trim();
					apply(key);
					check(key);
					await this.save();
				});
			new ListSuggest(this.app, text.inputEl, () => names.properties);
		});
	}
}

/**
 * A hue choice: optionally Auto (no chosen hue), then one swatch per tag hue, the chosen one
 * pressed. `onPick` gets null for Auto.
 */
function addHueRow(parent: HTMLElement, chosen: TagHue | null, withAuto: boolean, onPick: (hue: TagHue | null) => void): void {
	const row = parent.createDiv({ cls: "lc-hue-row", attr: { role: "group", "aria-label": "Hue" } });
	const buttons: HTMLButtonElement[] = [];
	const press = (pressed: HTMLButtonElement) => {
		for (const b of buttons) b.setAttr("aria-pressed", String(b === pressed));
	};
	if (withAuto) {
		const auto = row.createEl("button", { cls: "lc-hue-auto", text: "Auto", attr: { type: "button", "aria-pressed": String(chosen === null) } });
		setTooltip(auto, "The next hue in order");
		auto.addEventListener("click", () => { press(auto); onPick(null); });
		buttons.push(auto);
	}
	for (const hue of TAG_HUES) {
		const swatch = row.createEl("button", { cls: "lc-hue-swatch", attr: { type: "button", "aria-label": hue, "aria-pressed": String(hue === chosen) } });
		swatch.style.setProperty("--lc-hue", hueColour(hue));
		setTooltip(swatch, hue);
		swatch.addEventListener("click", () => { press(swatch); onPick(hue); });
		buttons.push(swatch);
	}
}

/** The element that scrolls `el` (itself or its nearest ancestor with scrolled content), if any. */
function scrollingAncestor(el: HTMLElement): HTMLElement | null {
	for (let node: HTMLElement | null = el; node; node = node.parentElement) {
		if (node.scrollTop > 0) return node;
	}
	return null;
}
