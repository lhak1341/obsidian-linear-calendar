import { App, Modal, Setting, setIcon, moment } from "obsidian";
import type { NoteCreator } from "./NoteCreator";
import type { PluginSettings } from "./types";
import { IconSuggest } from "./IconSuggest";

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
				const wrap = setting.controlEl.createSpan({ cls: "lc-icon-input-wrap" });
				const iconInput = wrap.createEl("input", {
					cls: "lc-icon-input",
					attr: { type: "text", placeholder: "Icon name" },
				});
				const iconPreview = wrap.createSpan({ cls: "lc-icon-preview" });
				new IconSuggest(this.app, iconInput);
				iconInput.addEventListener("input", () => {
					this.icon = iconInput.value.trim();
					iconPreview.empty();
					if (this.icon) setIcon(iconPreview, this.icon);
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

	private submit(): void {
		const date = parseInputDate(this.dateStr);
		if (!date) return;
		void this.noteCreator.create(date, {
			title: this.title,
			tag: this.tag || undefined,
			icon: this.icon || undefined,
			anniversary: this.anniversary,
			dateEnd: parseInputDate(this.dateEndStr),
			description: this.description || undefined,
		});
		this.close();
	}
}
