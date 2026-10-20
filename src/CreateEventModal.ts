import { App, Modal, Notice, Setting, TFile } from "obsidian";
import type { EventNotes } from "./EventNotes";
import type { PluginSettings } from "./types";
import { IconField } from "./IconField";
import { formatTagLabel } from "./utils/tagUtils";
import { readEventFields } from "./eventFields";
import { buildEventFields, emptyFormState, formStateFromFields } from "./eventForm";
import type { EventFormState, RemindUnit } from "./eventForm";
import { parseDateString } from "./utils/dateUtils";
import { eventNoteConfig, fileBaseName } from "./utils/eventNotePath";

export class CreateEventModal extends Modal {
	private form: EventFormState;
	private filenamePreviewEl!: HTMLElement;
	private readonly isEditing: boolean;

	constructor(
		app: App,
		private eventNotes: EventNotes,
		private settings: PluginSettings,
		initialDate: Date = new Date(),
		private editFilePath?: string,
	) {
		super(app);
		this.isEditing = !!editFilePath;
		this.form = emptyFormState(initialDate);
		if (editFilePath) this.prefillFromFile(editFilePath);
	}

	private prefillFromFile(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return;
		const mapping = this.settings.defaultMapping;
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};

		const { date, fields } = readEventFields(fm, mapping);
		const title = mapping.titleProp === "__filename__" ? file.basename : fields.title;
		this.form = formStateFromFields(date, { ...fields, title }, this.form);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("lc-create-event-modal");
		this.setTitle(this.isEditing ? "Edit event" : "Create event");

		let titleInputEl: HTMLInputElement;
		new Setting(contentEl)
			.setName("Title")
			.addText((text) => {
				titleInputEl = text.inputEl;
				text.setValue(this.form.title).setPlaceholder("Untitled").onChange((value) => {
					this.form.title = value;
					this.updatePreview();
				});
				if (this.isEditing && this.settings.defaultMapping.titleProp === "__filename__") {
					text.setDisabled(true);
					text.inputEl.title = "Derived from the filename — editing here has no effect.";
				}
			});

		const metaRow = contentEl.createDiv({ cls: "lc-create-event-row" });
		const tagOptions = Object.keys(this.settings.colorMap).sort();
		new Setting(metaRow)
			.setName("Tags")
			.addDropdown((dd) => {
				dd.addOption("", "Uncategorized");
				for (const tag of tagOptions) {
					dd.addOption(tag, formatTagLabel(tag));
				}
				dd.setValue(this.form.tag).onChange((value) => {
					this.form.tag = value;
				});
			});

		new Setting(metaRow)
			.setName("Icon")
			.then((setting) => {
				new IconField(this.app, setting.controlEl, {
					initialValue: this.form.icon,
					onPreview: (val) => { this.form.icon = val; },
				});
			});

		new Setting(metaRow)
			.setName("Date")
			.addText((text) => {
				text.inputEl.type = "date";
				text.setValue(this.form.dateStr).onChange((value) => {
					this.form.dateStr = value;
					this.updatePreview();
				});
			});
		new Setting(metaRow)
			.setName("Date end")
			.addText((text) => {
				text.inputEl.type = "date";
				text.setValue(this.form.dateEndStr).onChange((value) => {
					this.form.dateEndStr = value;
				});
			});
		contentEl.createEl("p", {
			cls: "setting-item-description lc-create-event-hint",
			text: "Leave date end blank for a single-day event.",
		});

		new Setting(contentEl)
			.setName("Anniversary")
			.setDesc("Repeats on the same date every subsequent year.")
			.addToggle((toggle) =>
				toggle.setValue(this.form.anniversary).onChange((value) => {
					this.form.anniversary = value;
				}),
			);

		if (this.settings.defaultMapping.remindProp) {
			let amountInputEl!: HTMLInputElement;
			let unitDropdownEl!: HTMLSelectElement;
			let exactDateEl!: HTMLInputElement;

			new Setting(contentEl)
				.setName("Remind me")
				.setDesc("Also show a translucent ghost bar at a future date. Click it later to spin off a new note there.")
				.addToggle((toggle) =>
					toggle.setValue(this.form.remindEnabled).onChange((value) => {
						this.form.remindEnabled = value;
						remindControls.toggleClass("lc-hidden", !value);
					}),
				);

			const remindControls = contentEl.createDiv();
			remindControls.toggleClass("lc-hidden", !this.form.remindEnabled);
			new Setting(remindControls)
				.setClass("lc-remind-setting")
				.addDropdown((dd) =>
					dd
						.addOption("relative", "In…")
						.addOption("exact", "On date…")
						.setValue(this.form.remindMode)
						.onChange((value) => {
							this.form.remindMode = value as "relative" | "exact";
							const isRelative = this.form.remindMode === "relative";
							amountInputEl.toggleClass("lc-hidden", !isRelative);
							unitDropdownEl.toggleClass("lc-hidden", !isRelative);
							exactDateEl.toggleClass("lc-hidden", isRelative);
						}),
				)
				.addText((text) => {
					text.inputEl.type = "number";
					text.inputEl.min = "1";
					text.inputEl.addClass("lc-remind-amount");
					text.setPlaceholder("4").onChange((value) => {
						this.form.remindAmount = value;
					});
					amountInputEl = text.inputEl;
				})
				.addDropdown((dd) => {
					dd.addOption("days", "Days")
						.addOption("weeks", "Weeks")
						.addOption("months", "Months")
						.addOption("years", "Years")
						.setValue(this.form.remindUnit)
						.onChange((value) => {
							this.form.remindUnit = value as RemindUnit;
						});
					unitDropdownEl = dd.selectEl;
				})
				.addText((text) => {
					text.inputEl.type = "date";
					text.setValue(this.form.remindStr).onChange((value) => {
						this.form.remindStr = value;
					});
					exactDateEl = text.inputEl;
				});
			amountInputEl.toggleClass("lc-hidden", this.form.remindMode !== "relative");
			unitDropdownEl.toggleClass("lc-hidden", this.form.remindMode !== "relative");
			exactDateEl.toggleClass("lc-hidden", this.form.remindMode !== "exact");
		}

		if (this.settings.defaultMapping.descriptionProp) {
			new Setting(contentEl)
				.setName("Description")
				.addTextArea((text) => {
					text.inputEl.rows = 3;
					text.setValue(this.form.description).onChange((value) => {
						this.form.description = value;
					});
				});
		}

		this.filenamePreviewEl = contentEl.createDiv({ cls: "lc-create-event-filename" });
		this.updatePreview();

		new Setting(contentEl)
			.then((setting) => setting.settingEl.addClass("lc-create-event-actions"))
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()))
			.addButton((btn) => btn.setButtonText(this.isEditing ? "Save" : "Create").setCta().onClick(() => this.submit()));

		this.contentEl.addEventListener("keydown", (event: KeyboardEvent) => {
			// Only plain text-ish inputs submit: Enter must stay a newline in the textarea and a click on buttons/selects.
			if (event.key === "Enter" && !event.isComposing && !event.defaultPrevented && event.target instanceof HTMLInputElement) {
				event.preventDefault();
				this.submit();
			}
		});

		window.setTimeout(() => titleInputEl.focus(), 0);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private updatePreview(): void {
		if (this.isEditing) {
			this.filenamePreviewEl.setText(`Editing: ${this.editFilePath} (not renamed or moved)`);
			return;
		}
		const date = parseDateString(this.form.dateStr);
		if (!date) {
			this.filenamePreviewEl.setText("");
			return;
		}
		const cfg = eventNoteConfig(this.settings);
		const folder = cfg.folder;
		const name = `${fileBaseName(date, this.form.title, cfg)}.md`;
		this.filenamePreviewEl.setText(`Will be created as: ${folder ? `${folder}/${name}` : name}`);
	}

	private submit(): void {
		const built = buildEventFields(this.form, { remindProp: this.settings.defaultMapping.remindProp });
		if (!built.ok) {
			if (built.error) new Notice(built.error);
			return;
		}
		const options = { ...built.fields, openAfterCreate: false };
		if (this.isEditing && this.editFilePath) {
			void this.eventNotes.update(this.editFilePath, built.date, options);
		} else {
			void this.eventNotes.create(built.date, options);
		}
		this.close();
	}
}
