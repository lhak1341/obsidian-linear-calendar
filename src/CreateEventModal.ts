import { App, Modal, Setting, moment } from "obsidian";
import type { NoteCreator } from "./NoteCreator";
import type { PluginSettings } from "./types";
import { IconField } from "./IconField";

const pad = (n: number) => String(n).padStart(2, "0");
const toInputDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseInputDate = (value: string): Date | undefined => {
	const [y, m, d] = value.split("-").map(Number);
	return y && m && d ? new Date(y, m - 1, d) : undefined;
};

export class CreateEventModal extends Modal {
	private title = "";
	private tag = "";
	private icon = "";
	private anniversary = false;
	private description = "";
	private dateStr: string;
	private dateEndStr = "";
	private remindEnabled = false;
	private remindMode: "relative" | "exact" = "relative";
	private remindStr = "";
	private remindAmount = "";
	private remindUnit: "days" | "weeks" | "months" | "years" = "days";
	private filenamePreviewEl!: HTMLElement;

	constructor(
		app: App,
		private noteCreator: NoteCreator,
		private settings: PluginSettings,
		initialDate: Date = new Date(),
	) {
		super(app);
		this.dateStr = toInputDate(initialDate);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("lc-create-event-modal");
		this.setTitle("Create event");

		let titleInputEl: HTMLInputElement;
		new Setting(contentEl)
			.setName("Title")
			.addText((text) => {
				titleInputEl = text.inputEl;
				text.setPlaceholder("Untitled").onChange((value) => {
					this.title = value;
					this.updatePreview();
				});
			});

		const metaRow = contentEl.createDiv({ cls: "lc-create-event-row" });
		const tagOptions = Object.keys(this.settings.colorMap).sort();
		new Setting(metaRow)
			.setName("Tags")
			.addDropdown((dd) => {
				dd.addOption("", "Uncategorized");
				for (const tag of tagOptions) {
					dd.addOption(tag, tag.replace(/^linear-calendar\//, ""));
				}
				dd.setValue(this.tag).onChange((value) => {
					this.tag = value;
				});
			});

		new Setting(metaRow)
			.setName("Icon")
			.then((setting) => {
				new IconField(this.app, setting.controlEl, {
					onPreview: (val) => { this.icon = val; },
				});
			});

		new Setting(metaRow)
			.setName("Date")
			.addText((text) => {
				text.inputEl.type = "date";
				text.setValue(this.dateStr).onChange((value) => {
					this.dateStr = value;
					this.updatePreview();
				});
			});
		new Setting(metaRow)
			.setName("Date end")
			.addText((text) => {
				text.inputEl.type = "date";
				text.onChange((value) => {
					this.dateEndStr = value;
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
				toggle.setValue(this.anniversary).onChange((value) => {
					this.anniversary = value;
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
					toggle.setValue(this.remindEnabled).onChange((value) => {
						this.remindEnabled = value;
						remindControls.toggleClass("lc-hidden", !value);
					}),
				);

			const remindControls = contentEl.createDiv({ cls: "lc-hidden" });
			new Setting(remindControls)
				.setClass("lc-remind-setting")
				.addDropdown((dd) =>
					dd
						.addOption("relative", "In…")
						.addOption("exact", "On date…")
						.setValue(this.remindMode)
						.onChange((value) => {
							this.remindMode = value as "relative" | "exact";
							const isRelative = this.remindMode === "relative";
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
						this.remindAmount = value;
					});
					amountInputEl = text.inputEl;
				})
				.addDropdown((dd) => {
					dd.addOption("days", "Days")
						.addOption("weeks", "Weeks")
						.addOption("months", "Months")
						.addOption("years", "Years")
						.setValue(this.remindUnit)
						.onChange((value) => {
							this.remindUnit = value as "days" | "weeks" | "months" | "years";
						});
					unitDropdownEl = dd.selectEl;
				})
				.addText((text) => {
					text.inputEl.type = "date";
					text.inputEl.addClass("lc-hidden");
					text.onChange((value) => {
						this.remindStr = value;
					});
					exactDateEl = text.inputEl;
				});
		}

		if (this.settings.defaultMapping.descriptionProp) {
			new Setting(contentEl)
				.setName("Description")
				.addTextArea((text) => {
					text.inputEl.rows = 3;
					text.onChange((value) => {
						this.description = value;
					});
				});
		}

		this.filenamePreviewEl = contentEl.createDiv({ cls: "lc-create-event-filename" });
		this.updatePreview();

		new Setting(contentEl)
			.then((setting) => setting.settingEl.addClass("lc-create-event-actions"))
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()))
			.addButton((btn) => btn.setButtonText("Create").setCta().onClick(() => this.submit()));

		this.contentEl.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Enter") {
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
		const date = parseInputDate(this.dateStr);
		if (!date) {
			this.filenamePreviewEl.setText("");
			return;
		}
		const fmt = this.settings.newEventDateFormat || "YYYY-MM-DD";
		const datePart = (moment as unknown as (d: Date) => { format(f: string): string })(date).format(fmt);
		const trimmedTitle = this.title.trim();
		const safeTitle = trimmedTitle ? trimmedTitle.replace(/[\\/:*?"<>|]/g, "-") : "Untitled";
		const folder = this.settings.newEventFolder;
		const name = `${datePart} ${safeTitle}.md`;
		this.filenamePreviewEl.setText(`Will be created as: ${folder ? `${folder}/${name}` : name}`);
	}

	private computeRemindDate(eventDate: Date): Date | undefined {
		if (this.remindMode === "exact") return parseInputDate(this.remindStr);
		const amount = Number(this.remindAmount);
		if (!Number.isFinite(amount) || amount <= 0) return undefined;
		return (moment as unknown as (d: Date) => { add(n: number, unit: string): { toDate(): Date } })(eventDate)
			.add(amount, this.remindUnit)
			.toDate();
	}

	private submit(): void {
		const date = parseInputDate(this.dateStr);
		if (!date) return;
		const remindProp = this.settings.defaultMapping.remindProp;
		const remindDate = remindProp && this.remindEnabled ? this.computeRemindDate(date) : undefined;
		void this.noteCreator.create(date, {
			title: this.title,
			tag: this.tag || undefined,
			icon: this.icon || undefined,
			anniversary: this.anniversary,
			dateEnd: parseInputDate(this.dateEndStr),
			description: this.description || undefined,
			extraFrontmatter: remindProp && remindDate ? { [remindProp]: toInputDate(remindDate) } : undefined,
			openAfterCreate: false,
		});
		this.close();
	}
}
