import {
    addMonths,
    formatDmy,
    latestOf,
    monthWeeks,
    parseDmy,
    placementOf,
    rangeProblem,
} from './dateFieldModel';

describe('dateFieldModel', () => {
    it('should show ISO dates as DD/MM/YYYY', () => {
        expect(formatDmy('2026-11-05')).toBe('05/11/2026');
        expect(formatDmy('')).toBe('');
    });

    it('should read typed DD/MM/YYYY (one-digit day / month too) into ISO', () => {
        expect(parseDmy('12/11/2026')).toBe('2026-11-12');
        expect(parseDmy(' 1/9/2026 ')).toBe('2026-09-01');
    });

    it('should refuse dates that do not exist or are not DD/MM/YYYY', () => {
        expect(parseDmy('31/11/2026')).toBeNull();
        expect(parseDmy('29/02/2026')).toBeNull();
        expect(parseDmy('29/02/2028')).toBe('2028-02-29');
        expect(parseDmy('2026-11-12')).toBeNull();
        expect(parseDmy('12/13/2026')).toBeNull();
        expect(parseDmy('12/11/26')).toBeNull();
        expect(parseDmy('')).toBeNull();
    });

    it('should move by months and keep the day within the month', () => {
        expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
        expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
        expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    });

    it('should lay a month out in weeks from Sunday', () => {
        const weeks = monthWeeks('2026-11-12');
        // 1/11/2026 = 星期日
        expect(weeks[0]?.[0]).toBe('2026-11-01');
        expect(weeks.at(-1)?.filter(Boolean).at(-1)).toBe('2026-11-30');
        expect(weeks.every((week) => week.length === 7)).toBe(true);
        const december = monthWeeks('2026-12-01');
        // 1/12/2026 = 星期二：前面兩格空
        expect(december[0]?.slice(0, 3)).toEqual([null, null, '2026-12-01']);
    });

    it('should say when a date is outside min / max', () => {
        expect(rangeProblem('2026-11-12', '2026-11-13', undefined)).toBe('min');
        expect(rangeProblem('2026-11-12', undefined, '2026-11-11')).toBe('max');
        expect(rangeProblem('2026-11-12', '2026-11-12', '2026-11-12')).toBeNull();
    });

    it('should open the calendar above the field only when below is too short and above is roomier', () => {
        const view = { top: 0, bottom: 800 };
        const field = (top: number) => ({ top, bottom: top + 30 });
        expect(placementOf(field(100), 300, view)).toBe('down');
        expect(placementOf(field(600), 300, view)).toBe('up');
        // 上面都唔夠位：照向下（向下多啲位）
        expect(placementOf(field(370), 500, view)).toBe('down');
        // 捲動容器（例如內容區）比 viewport 細：跟容器
        expect(placementOf(field(300), 300, { top: 0, bottom: 500 })).toBe('up');
    });

    it('should take the later of two optional dates for min', () => {
        expect(latestOf('2026-11-12', '2026-11-09')).toBe('2026-11-12');
        expect(latestOf('2026-11-12', '2026-11-20')).toBe('2026-11-20');
        expect(latestOf('2026-11-12', undefined)).toBe('2026-11-12');
    });
});
