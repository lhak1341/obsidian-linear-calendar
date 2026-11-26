import { describe, expect, it } from "vitest";
import { subscribeRepaints, type ChangeSource } from "./calendarRepaints";

class FakeSource implements ChangeSource {
	private subscribers = new Set<() => void>();
	onChange(cb: () => void): () => void {
		this.subscribers.add(cb);
		return () => { this.subscribers.delete(cb); };
	}
	fire(): void {
		for (const cb of [...this.subscribers]) cb();
	}
}

function setup() {
	const items = new FakeSource();
	const dailyNotes = new FakeSource();
	const settings = new FakeSource();
	const log: string[] = [];
	const dispose = subscribeRepaints(
		{ items, dailyNotes, settings },
		{ full: () => log.push("full"), bars: () => log.push("bars") },
	);
	return { items, dailyNotes, settings, log, dispose };
}

describe("subscribeRepaints", () => {
	it("repaints bars only when items change", () => {
		const { items, log } = setup();
		items.fire();
		expect(log).toEqual(["bars"]);
	});

	it("rebuilds fully when daily notes change", () => {
		const { dailyNotes, log } = setup();
		dailyNotes.fire();
		expect(log).toEqual(["full"]);
	});

	it("rebuilds fully when settings are saved", () => {
		const { settings, log } = setup();
		settings.fire();
		expect(log).toEqual(["full"]);
	});

	it("repaints nothing after dispose", () => {
		const { items, dailyNotes, settings, log, dispose } = setup();
		dispose();
		items.fire();
		dailyNotes.fire();
		settings.fire();
		expect(log).toEqual([]);
	});
});
