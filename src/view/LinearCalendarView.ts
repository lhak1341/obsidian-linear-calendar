import { ItemView, Menu, Notice, TFile, WorkspaceLeaf, debounce, moment, normalizePath, setIcon } from "obsidian";
import type { PluginSettings, ColumnMapping, CalendarItem } from "../types";
import { VIEW_TYPE_LINEAR_CALENDAR } from "../constants";
import { FrontmatterScanner } from "../data/FrontmatterScanner";
import { GridRenderer } from "./GridRenderer";
import { BarRenderer } from "./BarRenderer";
import { buildTagColorMap } from "../utils/colorUtils";
import { NowIndicator } from "./NowIndicator";
import { Tooltip } from "./Tooltip";
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
 *   onClose cleans up NowIndicator timer and Tooltip listener.
 */
export class LinearCalendarView extends ItemView {
	private currentYear: number;
	private hiddenCategories: Set<string> = new Set();
	private rowHeight = 0;
	private layout: "horizontal" | "vertical";
	private layoutToggleBtn!: HTMLElement;
	private scanner: FrontmatterScanner;
	private gridRenderer!: GridRenderer;
	private barRenderer: BarRenderer;
	private nowIndicator: NowIndicator;
	private tooltip!: Tooltip;
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
		this.scanner = new FrontmatterScanner(this.app);
		this.barRenderer = new BarRenderer(
			this.app,
			() => this.getMapping(),
			() => this.currentYear,
		);
		this.nowIndicator = new NowIndicator();
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

		// Toolbar
		const toolbar = contentEl.createDiv({ cls: "linear-calendar-toolbar" });
		this.buildToolbar(toolbar);

		// Scroll wrapper
		const scrollWrapper = contentEl.createDiv({
			cls: "linear-calendar-scroll",
		});

		this.gridRenderer = new GridRenderer(scrollWrapper);
		this.gridRenderer.setDayDblClickHandler((year, month, day) => {
			this.createNoteForDate(year, month, day);
		});
		this.tooltip = new Tooltip(contentEl);

		// Shift+scroll horizontal pan (horizontal mode only)
		this.registerDomEvent(scrollWrapper, "wheel", (evt: WheelEvent) => {
			if (evt.shiftKey && this.layout === "horizontal") {
				evt.preventDefault();
				scrollWrapper.scrollLeft += evt.deltaY;
			}
		});

		this.renderCalendar();

		// Scroll to today on first open
		requestAnimationFrame(() => this.scrollToNow());

		// Keyboard shortcuts
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
		this.nowIndicator.cleanup();
		this.tooltip.cleanup();
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

		// Row height slider
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
			this.applyRowHeightVars();
		});

		// Categories filter chips (before toggle so toggle sits at the end)
		this.categoriesContainer = toolbar.createDiv({ cls: "lc-categories" });

		// Layout toggle button
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
		// Icon shows what you'll switch TO
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

	private applyRowHeightVars(): void {
		const grid = this.gridRenderer.getContainer();
		if (this.layout === "vertical") {
			grid.style.setProperty("--lc-vert-row-h", `${20 + this.rowHeight * 0.4}px`);
		} else {
			grid.style.setProperty("--lc-row-min", `${this.rowHeight * 3}px`);
		}
	}

	private renderCalendar(): void {
		const mapping = this.getMapping();
		const allItems = this.scanner.scan(mapping, this.currentYear);

		const tagColorMap = buildTagColorMap(allItems, this.settings);
		this.renderCategories(allItems, tagColorMap);

		const items = allItems.filter((item) => {
			const tag = item.tags?.[0];
			if (!tag) return !this.hiddenCategories.has("__uncategorized__");
			return !this.hiddenCategories.has(tag);
		});

		if (!this.dailyNoteMapCache) {
			this.dailyNoteMapCache = getDailyNoteMap(this.app);
		}
		const dailyNoteMap = this.dailyNoteMapCache;
		const dailyNoteDates = new Set(dailyNoteMap.keys());

		const pad = (n: number) => String(n).padStart(2, "0");

		this.gridRenderer.setDayClickHandler((year, month, day) => {
			const file = dailyNoteMap.get(`${year}-${pad(month + 1)}-${pad(day)}`);
			if (file) this.app.workspace.openLinkText(file.path, "", false);
		});

		this.gridRenderer.setDayContextMenuHandler((year, month, day, event) => {
			const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
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
		});

		let monthRows;
		if (this.layout === "vertical") {
			monthRows = this.gridRenderer.renderVertical(
				this.currentYear,
				dailyNoteDates,
				this.settings.dailyNoteColor,
				this.settings.dailyNoteStyle,
				this.settings.alignMode,
			);
		} else {
			monthRows = this.gridRenderer.render(
				this.currentYear,
				0,
				this.settings.alignMode,
				dailyNoteDates,
				this.settings.dailyNoteColor,
				this.settings.dailyNoteStyle,
			);
		}

		this.applyRowHeightVars();

		const tagIconMap = new Map(Object.entries(this.settings.iconMap));
		this.barRenderer.render(monthRows, items, tagColorMap, tagIconMap);

		this.nowIndicator.cleanup();
		this.nowIndicator.render(monthRows, this.currentYear);

		this.tooltip.attach(this.gridRenderer.getContainer());
	}

	private renderCategories(
		items: CalendarItem[],
		tagColorMap: Map<string, string>,
	): void {
		this.categoriesContainer.empty();

		const categories = new Map<string, number>();
		for (const item of items) {
			const tag = item.tags?.[0] ?? "__uncategorized__";
			categories.set(tag, (categories.get(tag) ?? 0) + 1);
		}

		if (categories.size <= 1) return;

		for (const [tag, count] of categories) {
			const isHidden = this.hiddenCategories.has(tag);
			const displayName =
				tag === "__uncategorized__"
					? "Other"
					: tag.replace(/^linear-calendar\//, "");

			const color = tagColorMap.get(tag) ?? "#888";

			const chip = this.categoriesContainer.createDiv({
				cls: `lc-category-chip ${isHidden ? "lc-category-hidden" : ""}`,
			});

			const dot = chip.createSpan({ cls: "lc-category-dot" });
			dot.style.backgroundColor = color;

			chip.createSpan({
				cls: "lc-category-name",
				text: displayName,
			});

			chip.createSpan({
				cls: "lc-category-count",
				text: String(count),
			});

			chip.addEventListener("click", () => {
				if (this.hiddenCategories.has(tag)) {
					this.hiddenCategories.delete(tag);
				} else {
					this.hiddenCategories.add(tag);
				}
				this.renderCalendar();
			});
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
