import { ItemView, WorkspaceLeaf, debounce } from "obsidian";
import type { PluginSettings, ColumnMapping, CalendarItem } from "../types";
import { VIEW_TYPE_LINEAR_CALENDAR } from "../constants";
import { FrontmatterScanner } from "../data/FrontmatterScanner";
import { GridRenderer } from "./GridRenderer";
import { BarRenderer, buildTagColorMap } from "./BarRenderer";
import { NowIndicator } from "./NowIndicator";
import { Tooltip } from "./Tooltip";

type ViewDensity = "condense" | "normal" | "expand";

interface ViewState {
	year: number;
	hiddenCategories: string[];
	density: ViewDensity;
}

export class LinearCalendarView extends ItemView {
	private currentYear: number;
	private hiddenCategories: Set<string> = new Set();
	private density: ViewDensity = "normal";
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
		this.categoriesContainer = toolbar.createDiv({
			cls: "lc-categories",
		});

		// Scroll wrapper
		const scrollWrapper = contentEl.createDiv({
			cls: "linear-calendar-scroll",
		});

		this.gridRenderer = new GridRenderer(scrollWrapper);
		this.gridRenderer.setDayClickHandler((year, month, day) => {
			this.createNoteForDate(year, month, day);
		});
		this.tooltip = new Tooltip(contentEl);

		// Shift+scroll horizontal pan
		scrollWrapper.addEventListener("wheel", (evt) => {
			if (evt.shiftKey) {
				evt.preventDefault();
				scrollWrapper.scrollLeft += evt.deltaY;
			}
		});

		this.renderCalendar();

		// Keyboard shortcuts
		contentEl.tabIndex = 0;
		contentEl.addEventListener("keydown", (evt) => {
			this.handleKeydown(evt);
		});

		const debouncedRender = debounce(() => this.renderCalendar(), 150, true);
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
			density: this.density,
		};
	}

	async setState(state: unknown, result: unknown): Promise<void> {
		const s = state as Partial<ViewState> | undefined;
		if (s?.year) this.currentYear = s.year;
		if (s?.hiddenCategories) {
			this.hiddenCategories = new Set(s.hiddenCategories);
		}
		if (s?.density) this.density = s.density;
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

		// Density slider (3 stops)
		const densityWrap = toolbar.createDiv({ cls: "lc-density" });
		const densityMap: ViewDensity[] = ["condense", "normal", "expand"];
		const slider = densityWrap.createEl("input", {
			cls: "lc-density-slider",
			attr: {
				type: "range",
				min: "0",
				max: "2",
				step: "1",
				"aria-label": "View density",
			},
		});
		(slider as HTMLInputElement).value = String(
			densityMap.indexOf(this.density),
		);
		slider.addEventListener("input", () => {
			this.density = densityMap[Number((slider as HTMLInputElement).value)];
			this.renderCalendar();
		});
	}

	private updateYearLabel(): void {
		const label = this.contentEl.querySelector('[data-role="year-label"]');
		if (label) label.textContent = String(this.currentYear);
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

		const colMinWidth = this.density === "expand" ? 28 : 0;
		const monthRows = this.gridRenderer.render(
			this.currentYear,
			colMinWidth,
		);

		// Apply density class to grid
		const grid = this.gridRenderer.getContainer();
		grid.removeClass("lc-density-condense", "lc-density-normal", "lc-density-expand");
		grid.addClass(`lc-density-${this.density}`);

		this.barRenderer.render(monthRows, items, tagColorMap, () => {
			this.renderCalendar();
		});

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
		// Ignore if user is typing in an input
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

		// Find unique filename
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
