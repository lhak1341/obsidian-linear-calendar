import { ItemView, WorkspaceLeaf, debounce, setIcon } from "obsidian";
import type { PluginSettings, ColumnMapping, CalendarItem } from "../types";
import { VIEW_TYPE_LINEAR_CALENDAR } from "../constants";
import { FrontmatterScanner } from "../data/FrontmatterScanner";
import { GridRenderer } from "./GridRenderer";
import { BarRenderer, buildTagColorMap } from "./BarRenderer";
import { NowIndicator } from "./NowIndicator";
import { Tooltip } from "./Tooltip";
import { getDailyNoteMap } from "../utils/dailyNotes";

interface ViewState {
	year: number;
	hiddenCategories: string[];
	rowHeight: number;
	layout: "horizontal" | "vertical";
}

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
			this.app.vault.on("create", () => debouncedRender()),
		);
		this.registerEvent(
			this.app.vault.on("delete", () => debouncedRender()),
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
		prevBtn.addEventListener("click", () => {
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
		nextBtn.addEventListener("click", () => {
			this.currentYear++;
			this.renderCalendar();
			this.updateYearLabel();
		});

		const todayBtn = toolbar.createEl("button", {
			cls: "lc-today-btn clickable-icon",
			text: "Today",
		});
		todayBtn.addEventListener("click", () => {
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
		slider.addEventListener("input", () => {
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
		this.layoutToggleBtn.addEventListener("click", () => {
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

		const dailyNoteMap = getDailyNoteMap(this.app);
		const dailyNoteDates = new Set(dailyNoteMap.keys());

		this.gridRenderer.setDayClickHandler((year, month, day) => {
			const pad = (n: number) => String(n).padStart(2, "0");
			const file = dailyNoteMap.get(`${year}-${pad(month + 1)}-${pad(day)}`);
			if (file) this.app.workspace.openLinkText(file.path, "", false);
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

		this.barRenderer.render(monthRows, items, tagColorMap);

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
		const pad = (n: number) => String(n).padStart(2, "0");
		const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
		const mapping = this.getMapping();

		const fileName = `${dateStr} Untitled.md`;
		const frontmatter = [
			"---",
			`${mapping.startDateProp}: ${dateStr}`,
			"---",
			"",
		].join("\n");

		let path = fileName;
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = `${dateStr} Untitled ${counter}.md`;
			counter++;
		}

		const file = await this.app.vault.create(path, frontmatter);
		await this.app.workspace.openLinkText(file.path, "", false);
	}

	private scrollToNow(): void {
		const todayEl = this.contentEl.querySelector(".lc-today-circle");
		todayEl?.scrollIntoView({ behavior: "smooth", block: "center" });
	}
}
