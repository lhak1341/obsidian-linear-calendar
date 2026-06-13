import { ItemView, Menu, Notice, TFile, WorkspaceLeaf, debounce, moment, normalizePath, setIcon } from "obsidian";
import type { PluginSettings, ColumnMapping } from "../types";
import { VIEW_TYPE_LINEAR_CALENDAR } from "../constants";
import { FrontmatterScanner } from "../data/FrontmatterScanner";
import { CalendarRenderer } from "./CalendarRenderer";
import { createDailyNote, getDailyNoteMap } from "../utils/dailyNotes";

interface ViewState {
	year: number;
	hiddenCategories: string[];
	rowHeight: number;
	layout: "horizontal" | "vertical";
}

/**
 * Public interface:
 *   refresh()          — force re-render (called by plugin after settings save)
 *   getState()         — persists { year, hiddenCategories, rowHeight, layout } across reloads
 *   setState(s, r)     — restores persisted state, then re-renders
 *
 * Re-render triggers: vault create/delete/metadataCache changed (debounced 300ms),
 *   year nav buttons, layout toggle, category chip clicks, ResizeObserver (debounced 200ms).
 *
 * Lifecycle: onOpen builds DOM once; renderCalendar() clears and repaints the grid each call.
 *   onClose cleans up CalendarRenderer (NowIndicator timer, Tooltip listener).
 */
export class LinearCalendarView extends ItemView {
	private currentYear: number;
	private hiddenCategories: Set<string> = new Set();
	private rowHeight = 0;
	private layout: "horizontal" | "vertical";
	private layoutToggleBtn!: HTMLElement;
	private calendarRenderer!: CalendarRenderer;
	private settings: PluginSettings;
	private getMapping: () => ColumnMapping;
	private categoriesContainer!: HTMLElement;
	private dailyNoteMapCache: Map<string, TFile> | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		settings: PluginSettings,
		getMapping: () => ColumnMapping,
	) {
		super(leaf);
		this.settings = settings;
		this.getMapping = getMapping;
		this.currentYear = new Date().getFullYear();
		this.layout = window.innerWidth < 768 ? "vertical" : "horizontal";
	}

	getViewType(): string {
		return VIEW_TYPE_LINEAR_CALENDAR;
	}

	getDisplayText(): string {
		return "Linear Calendar";
	}

	getIcon(): string {
		return "calendar-range";
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("linear-calendar-container");

		const toolbar = contentEl.createDiv({ cls: "linear-calendar-toolbar" });
		this.buildToolbar(toolbar);

		const scrollWrapper = contentEl.createDiv({ cls: "linear-calendar-scroll" });

		const scanner = new FrontmatterScanner(this.app);
		this.calendarRenderer = new CalendarRenderer(
			this.app,
			scrollWrapper,
			this.categoriesContainer,
			scanner,
			this.settings,
			() => this.getMapping(),
			{
				onDayDblClick: (y, m, d) => this.createNoteForDate(y, m, d),
				onDayContextMenu: (y, m, d, e) => this.showDayContextMenu(y, m, d, e),
				onCategoryToggle: (tag) => {
					if (this.hiddenCategories.has(tag)) {
						this.hiddenCategories.delete(tag);
					} else {
						this.hiddenCategories.add(tag);
					}
					this.renderCalendar();
				},
				onDropCommit: (filePath, newStart, newEnd) => this.commitDrop(filePath, newStart, newEnd),
			},
		);

		this.registerDomEvent(scrollWrapper, "wheel", (evt: WheelEvent) => {
			if (evt.shiftKey && this.layout === "horizontal") {
				evt.preventDefault();
				scrollWrapper.scrollLeft += evt.deltaY;
			}
		});

		this.renderCalendar();

		requestAnimationFrame(() => this.scrollToNow());

		contentEl.tabIndex = 0;
		this.registerDomEvent(contentEl, "keydown", (evt: KeyboardEvent) => {
			this.handleKeydown(evt);
		});

		const debouncedRender = debounce(() => this.renderCalendar(), 300, true);
		this.registerEvent(
			this.app.metadataCache.on("changed", () => debouncedRender()),
		);
		this.registerEvent(
			this.app.vault.on("create", () => { this.dailyNoteMapCache = null; debouncedRender(); }),
		);
		this.registerEvent(
			this.app.vault.on("delete", () => { this.dailyNoteMapCache = null; debouncedRender(); }),
		);
		this.registerEvent(
			this.app.vault.on("rename", () => { this.dailyNoteMapCache = null; debouncedRender(); }),
		);

		const ro = new ResizeObserver(
			debounce(() => this.renderCalendar(), 200, true),
		);
		ro.observe(scrollWrapper);
		this.register(() => ro.disconnect());
	}

	async onClose(): Promise<void> {
		this.calendarRenderer.cleanup();
	}

	getState(): Record<string, unknown> {
		return {
			year: this.currentYear,
			hiddenCategories: [...this.hiddenCategories],
			rowHeight: this.rowHeight,
			layout: this.layout,
		};
	}

	async setState(state: unknown, result: unknown): Promise<void> {
		const s = state as Partial<ViewState> | undefined;
		if (s?.year) this.currentYear = s.year;
		if (s?.hiddenCategories) {
			this.hiddenCategories = new Set(s.hiddenCategories);
		}
		if (s?.rowHeight != null) this.rowHeight = s.rowHeight;
		if (s?.layout) this.layout = s.layout;
		this.renderCalendar();
		await super.setState(state, result as { history: boolean });
	}

	private buildToolbar(toolbar: HTMLElement): void {
		const nav = toolbar.createDiv({ cls: "lc-nav" });

		const prevBtn = nav.createEl("button", {
			cls: "lc-nav-btn clickable-icon",
			attr: { "aria-label": "Previous year" },
		});
		prevBtn.textContent = "‹";
		this.registerDomEvent(prevBtn, "click", () => {
			this.currentYear--;
			this.renderCalendar();
			this.updateYearLabel();
		});

		nav.createSpan({
			cls: "lc-year-label",
			text: String(this.currentYear),
		}).dataset.role = "year-label";

		const nextBtn = nav.createEl("button", {
			cls: "lc-nav-btn clickable-icon",
			attr: { "aria-label": "Next year" },
		});
		nextBtn.textContent = "›";
		this.registerDomEvent(nextBtn, "click", () => {
			this.currentYear++;
			this.renderCalendar();
			this.updateYearLabel();
		});

		const todayBtn = toolbar.createEl("button", {
			cls: "lc-today-btn clickable-icon",
			text: "Today",
		});
		this.registerDomEvent(todayBtn, "click", () => {
			this.currentYear = new Date().getFullYear();
			this.renderCalendar();
			this.updateYearLabel();
			this.scrollToNow();
		});

		const densityWrap = toolbar.createDiv({ cls: "lc-density" });
		const slider = densityWrap.createEl("input", {
			cls: "lc-density-slider",
			attr: {
				type: "range",
				min: "0",
				max: "100",
				step: "1",
				"aria-label": "Row height",
			},
		});
		(slider as HTMLInputElement).value = String(this.rowHeight);
		this.registerDomEvent(slider as HTMLInputElement, "input", () => {
			this.rowHeight = Number((slider as HTMLInputElement).value);
			this.calendarRenderer.updateRowHeight(this.layout, this.rowHeight);
		});

		this.categoriesContainer = toolbar.createDiv({ cls: "lc-categories" });

		this.layoutToggleBtn = toolbar.createEl("button", {
			cls: "lc-layout-toggle clickable-icon",
		});
		this.updateLayoutToggleIcon();
		this.registerDomEvent(this.layoutToggleBtn, "click", () => {
			this.layout = this.layout === "horizontal" ? "vertical" : "horizontal";
			this.updateLayoutToggleIcon();
			this.renderCalendar();
			requestAnimationFrame(() => this.scrollToNow());
		});
	}

	private updateLayoutToggleIcon(): void {
		setIcon(this.layoutToggleBtn, this.layout === "horizontal" ? "chevrons-up-down" : "chevrons-left-right");
		this.layoutToggleBtn.setAttribute(
			"aria-label",
			this.layout === "horizontal" ? "Switch to vertical layout" : "Switch to horizontal layout",
		);
	}

	private updateYearLabel(): void {
		const label = this.contentEl.querySelector('[data-role="year-label"]');
		if (label) label.textContent = String(this.currentYear);
	}

	private renderCalendar(): void {
		if (!this.dailyNoteMapCache) {
			this.dailyNoteMapCache = getDailyNoteMap(this.app);
		}
		const dailyNoteMap = this.dailyNoteMapCache;
		this.calendarRenderer.render(
			this.currentYear,
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
			this.hiddenCategories,
			this.layout,
			this.settings.alignMode,
			this.rowHeight,
			new Set(dailyNoteMap.keys()),
			dailyNoteMap,
		);
	}

	private showDayContextMenu(year: number, month: number, day: number, event: MouseEvent): void {
		const pad = (n: number) => String(n).padStart(2, "0");
		const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
		const dailyNoteMap = this.dailyNoteMapCache ?? new Map<string, TFile>();
		const menu = new Menu();
		if (!dailyNoteMap.has(dateKey)) {
			menu.addItem((item) =>
				item.setTitle("Create daily note")
					.setIcon("file-plus")
					.onClick(async () => {
						try {
							const file = await createDailyNote(this.app, year, month, day);
							await this.app.workspace.openLinkText(file.path, "", false);
						} catch (err) {
							console.error("[linear-calendar] create daily note failed:", err);
							new Notice("Failed to create daily note.");
						}
					})
			);
		}
		menu.addItem((item) =>
			item.setTitle("Create event")
				.setIcon("calendar-plus")
				.onClick(() => this.createNoteForDate(year, month, day))
		);
		menu.showAtMouseEvent(event);
	}

	private async commitDrop(filePath: string, newStart: Date, newEnd: Date): Promise<void> {
		const mapping = this.getMapping();
		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile | null;
		if (!file) return;
		const pad = (n: number) => String(n).padStart(2, "0");
		const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		try {
			await this.app.fileManager.processFrontMatter(file, (fm) => {
				fm[mapping.startDateProp] = fmt(newStart);
				if (fmt(newStart) !== fmt(newEnd) || fm[mapping.endDateProp]) {
					fm[mapping.endDateProp] = fmt(newEnd);
				}
			});
		} catch (err) {
			console.error("[linear-calendar] drag write failed:", err);
		}
	}

	refresh(): void {
		this.renderCalendar();
	}

	private handleKeydown(evt: KeyboardEvent): void {
		if (evt.target instanceof HTMLInputElement || evt.target instanceof HTMLTextAreaElement) return;

		switch (evt.key) {
			case "ArrowLeft":
				this.currentYear--;
				this.renderCalendar();
				this.updateYearLabel();
				evt.preventDefault();
				break;
			case "ArrowRight":
				this.currentYear++;
				this.renderCalendar();
				this.updateYearLabel();
				evt.preventDefault();
				break;
			case "t":
			case "T":
				this.currentYear = new Date().getFullYear();
				this.renderCalendar();
				this.updateYearLabel();
				this.scrollToNow();
				evt.preventDefault();
				break;
		}
	}

	private async createNoteForDate(year: number, month: number, day: number): Promise<void> {
		try {
			const pad = (n: number) => String(n).padStart(2, "0");
			const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
			const mapping = this.getMapping();
			const folder = this.settings.newEventFolder;
			const fmt = this.settings.newEventDateFormat || "YYYY-MM-DD";
			const datePart = (moment as unknown as (d: Date) => { format(f: string): string })(new Date(year, month, day)).format(fmt);

			if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
				await this.app.vault.createFolder(folder);
			}

			const base = folder ? `${folder}/${datePart} Untitled` : `${datePart} Untitled`;
			let path = normalizePath(`${base}.md`);
			let counter = 1;
			while (this.app.vault.getAbstractFileByPath(path)) {
				path = normalizePath(`${base} ${counter}.md`);
				counter++;
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const templater = (this.app as any).plugins?.getPlugin("templater-obsidian");
			const templateSetting = this.settings.newEventTemplate;
			const templateFile = templateSetting
				? this.app.vault.getAbstractFileByPath(
					normalizePath(templateSetting.endsWith(".md") ? templateSetting : `${templateSetting}.md`),
				)
				: null;

			let file: TFile;
			if (templater && templateFile instanceof TFile) {
				file = await this.app.vault.create(path, "");
				await templater.templater.write_template_to_file(templateFile, file);
				await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
					fm[mapping.startDateProp] = dateStr;
					const existing = Array.isArray(fm.tags)
						? (fm.tags as unknown[]).map(String)
						: fm.tags ? [String(fm.tags)] : [];
					if (!existing.includes("linear-calendar")) existing.unshift("linear-calendar");
					fm.tags = existing;
				});
			} else {
				const frontmatter = [
					"---",
					`tags: [linear-calendar]`,
					`${mapping.startDateProp}: ${dateStr}`,
					"---",
					"",
				].join("\n");
				file = await this.app.vault.create(path, frontmatter);
			}

			await this.app.workspace.openLinkText(file.path, "", false);
		} catch (err) {
			console.error("[linear-calendar] create event failed:", err);
			new Notice("Failed to create event note.");
		}
	}

	private scrollToNow(): void {
		const todayEl = this.contentEl.querySelector(".lc-today-circle");
		todayEl?.scrollIntoView({ behavior: "smooth", block: "center" });
	}
}
