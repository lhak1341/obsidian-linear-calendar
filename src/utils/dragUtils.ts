export interface GhostSeg {
	month: number;
	startDay: number;
	endDay: number;
}

export type RowOccupancy = Map<number, [number, number][]>;

export function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

export function mDays(month: number, year: number): number {
	return new Date(year, month + 1, 0).getDate();
}

export function segmentDates(start: Date, end: Date, year: number): GhostSeg[] {
	const segs: GhostSeg[] = [];
	const yStart = new Date(year, 0, 1);
	const yEnd = new Date(year, 11, 31);
	const s = start < yStart ? yStart : start;
	const e = end > yEnd ? yEnd : end;
	if (s > e) return segs;

	const sM = s.getMonth();
	const eM = e.getMonth();

	if (sM === eM) {
		segs.push({ month: sM, startDay: s.getDate(), endDay: e.getDate() });
	} else {
		segs.push({ month: sM, startDay: s.getDate(), endDay: mDays(sM, year) });
		for (let m = sM + 1; m < eM; m++) {
			segs.push({ month: m, startDay: 1, endDay: mDays(m, year) });
		}
		segs.push({ month: eM, startDay: 1, endDay: e.getDate() });
	}
	return segs;
}

export function findFreeRow(occ: RowOccupancy, startDay: number, endDay: number): number {
	for (let r = 0; r < 20; r++) {
		const spans = occ.get(r);
		if (!spans || !spans.some(([s, e]) => startDay <= e && endDay >= s)) return r;
	}
	return occ.size;
}

export function newDatesFromDelta(
	originalStart: Date,
	originalEnd: Date,
	mode: "resize-start" | "resize-end" | "move",
	dayDelta: number,
): { newStart: Date; newEnd: Date } {
	if (mode === "resize-end") {
		const newEnd = addDays(originalEnd, dayDelta);
		return {
			newStart: new Date(originalStart),
			newEnd: newEnd < originalStart ? new Date(originalStart) : newEnd,
		};
	}
	if (mode === "resize-start") {
		const newStart = addDays(originalStart, dayDelta);
		return {
			newStart: newStart > originalEnd ? new Date(originalEnd) : newStart,
			newEnd: new Date(originalEnd),
		};
	}
	return {
		newStart: addDays(originalStart, dayDelta),
		newEnd: addDays(originalEnd, dayDelta),
	};
}
