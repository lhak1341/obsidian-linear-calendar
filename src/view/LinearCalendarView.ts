import { ItemView, Menu, Notice, TFile, WorkspaceLeaf, debounce, setIcon } from "obsidian";
import type { PluginSettings, ColumnMapping } from "../types";
import { VIEW_TYPE_LINEAR_CALENDAR } from "../constants";
import type { DataSource } from "../data/DataSource";
import type { NoteCreator } from "../NoteCreator";
import { CalendarRenderer, RenderConfig } from "./CalendarRenderer";
import { createDailyNote, getDailyNoteMap } from "../utils/dailyNotes";
import { writeDragDates } from "../utils/frontmatterUtils";

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
 * Re-render triggers: metadataCache changed for calendar files (debounced 300ms),
 *   vault create/delete/rename, year nav buttons, layout toggle.
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
	private source: DataSource;
	private noteCreator: NoteCreator;
	private categoriesContainer!: HTMLElement;
	private dailyNoteMapCache: Map<string, TFile> | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		settings: PluginSettings,
		getMapping: () => ColumnMapping,
		source: DataSource,
		noteCreator: NoteCreator,
	) {
		super(leaf);
		this.settings = settings;
		this.getMapping = getMapping;
		this.source = source;
		this.noteCreator = noteCreator;
		this.currentYear = new Date().getFullYear();
		this.layout = window.innerWidth < 768 ? "vertical" : "horizontal";
	}

	getViewType(): string {
		return VIEW_TYPE_LINEAR_CALENDAR;
	}

	getDisplayText(): string {
		return "Linear calendar";
	}

	getIcon(): string {
		return "calendar-range";
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("linear-calendar-container");
		this.applyFont();

		const toolbar = contentEl.createDiv({ cls: "linear-calendar-toolbar" });
		this.buildToolbar(toolbar);

		const scrollWrapper = contentEl.createDiv({ cls: "linear-calendar-scroll" });

		this.calendarRenderer = new CalendarRenderer(
			this.app,
			scrollWrapper,
			this.categoriesContainer,
			this.source,
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
					this.renderBarsOnly();
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

		window.requestAnimationFrame(() => this.scrollToNow());

		contentEl.tabIndex = 0;
		this.registerDomEvent(contentEl, "keydown", (evt: KeyboardEvent) => {
			this.handleKeydown(evt);
		});

		const debouncedRender = debounce(() => this.renderCalendar(), 300, true);
		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				// Skip re-render for files that have never been (and aren't now) calendar notes.
				if (this.source.hasCalendarEntry(file.path)) {
					debouncedRender();
					return;
				}
				const fm = this.app.metadataCache.getFileCache(file);
				const fmTags = Array.isArray(fm?.frontmatter?.tags)
					? (fm.frontmatter.tags as unknown[]).map(String)
					: typeof fm?.frontmatter?.tags === "string"
						? [String(fm.frontmatter.tags)]
						: [];
				const inlineTags = (fm?.tags ?? []).map((t) => t.tag);
				const isCalendar = [...fmTags, ...inlineTags].some(
					(t) => t === "linear-calendar" || t === "#linear-calendar" ||
						t.startsWith("linear-calendar/") || t.startsWith("#linear-calendar/"),
				);
				if (isCalendar) debouncedRender();
			}),
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
		(slider).value = String(this.rowHeight);
		this.registerDomEvent(slider, "input", () => {
			this.rowHeight = Number((slider).value);
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
			window.requestAnimationFrame(() => this.scrollToNow());
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
		const config: RenderConfig = {
			year: this.currentYear,
			months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
			hiddenCategories: this.hiddenCategories,
			layout: this.layout,
			alignMode: this.settings.alignMode,
			rowHeight: this.rowHeight,
			dailyNoteMap: this.dailyNoteMapCache,
			colorMap: this.settings.colorMap,
			iconMap: this.settings.iconMap,
			dailyNoteColor: this.settings.dailyNoteColor,
			dailyNoteStyle: this.settings.dailyNoteStyle,
		};
		this.calendarRenderer.render(config);
	}

	private renderBarsOnly(): void {
		if (!this.dailyNoteMapCache) {
			this.dailyNoteMapCache = getDailyNoteMap(this.app);
		}
		const config: RenderConfig = {
			year: this.currentYear,
			months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
			hiddenCategories: this.hiddenCategories,
			layout: this.layout,
			alignMode: this.settings.alignMode,
			rowHeight: this.rowHeight,
			dailyNoteMap: this.dailyNoteMapCache,
			colorMap: this.settings.colorMap,
			iconMap: this.settings.iconMap,
			dailyNoteColor: this.settings.dailyNoteColor,
			dailyNoteStyle: this.settings.dailyNoteStyle,
		};
		this.calendarRenderer.renderBars(config);
	}

	private showDayContextMenu(year: number, month: number, day: number, event: MouseEvent): void {
		const pad = (n: number) => String(n).padStart(2, "0");
		const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
		const dailyNoteMap = this.dailyNoteMapCache ?? getDailyNoteMap(this.app);
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
		try {
			await writeDragDates(this.app, filePath, this.getMapping(), newStart, newEnd);
		} catch (err) {
			console.error("[linear-calendar] drag write failed:", err);
		}
	}

	refresh(): void {
		this.applyFont();
		this.renderCalendar();
	}

	private applyFont(): void {
		const { font, fontCustom } = this.settings;
		let value: string | null = null;
		if (font === "obsidian-interface") value = "var(--font-interface)";
		else if (font === "obsidian-text") value = "var(--font-text)";
		else if (font === "obsidian-monospace") value = "var(--font-monospace)";
		else if (font === "custom" && fontCustom) value = fontCustom;
		if (value) this.contentEl.style.setProperty("--lc-font", value);
		else this.contentEl.style.removeProperty("--lc-font");
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

	private createNoteForDate(year: number, month: number, day: number): void {
		void this.noteCreator.create(new Date(year, month, day));
	}

	private scrollToNow(): void {
		const todayEl = this.contentEl.querySelector(".lc-today-circle");
		todayEl?.scrollIntoView({ behavior: "smooth", block: "center" });
	}
}
