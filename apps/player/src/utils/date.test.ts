import {
    formatDateLabel,
    formatDayMonth,
    formatSpokenDate,
    formatWeekday,
    hkTimeHHMM,
} from './date';

describe('hkTimeHHMM', () => {
    it('formats Hong Kong time as HHMM like recording file names', () => {
        // UTC 19/10 01:05 = 香港 19/10 09:05
        expect(hkTimeHHMM(new Date('2026-10-19T01:05:00Z'))).toBe('0905');
    });

    it('uses 00 for the hour right after Hong Kong midnight', () => {
        // UTC 19/10 16:30 = 香港 20/10 00:30
        expect(hkTimeHHMM(new Date('2026-10-19T16:30:00Z'))).toBe('0030');
    });

    it('stays on 23 just before Hong Kong midnight', () => {
        expect(hkTimeHHMM(new Date('2026-10-19T15:59:00Z'))).toBe('2359');
    });
});

describe('formatDateLabel', () => {
    it('formats as DD/MM with Chinese weekday', () => {
        expect(formatDateLabel('2026-10-17')).toBe('17/10（六）');
        expect(formatDateLabel('2026-10-19')).toBe('19/10（一）');
        expect(formatDateLabel('2026-10-25')).toBe('25/10（日）');
    });
});

describe('formatDayMonth / formatWeekday', () => {
    it('splits the label into day/month and weekday', () => {
        expect(formatDayMonth('2026-10-05')).toBe('05/10');
        expect(formatWeekday('2026-10-19')).toBe('星期一');
    });
});

// 讀屏日子一律「17/10 星期六」（文案決定 2026-11-05 全域規則；畫面先用「17/10（六）」）
describe('formatSpokenDate', () => {
    it('reads day/month then the full weekday, separated by a space', () => {
        expect(formatSpokenDate('2026-10-17')).toBe('17/10 星期六');
        expect(formatSpokenDate('2026-11-06')).toBe('06/11 星期五');
    });
});
