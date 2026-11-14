import type { ChangeSummary } from '@903-player/catalog';
import { itemName, itemRange, whenLabel } from './timelineModel';

/** shortDate 跨年會加年份（S-830）：固定「今日」喺 2026，唔跟真實時鐘 */
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T04:00:00Z'));
});

afterEach(() => {
    vi.useRealTimers();
});

const lancy = { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' } as const;
const SUMMARY = {
    items: [
        {
            kind: 'newEpisodes',
            when: 'now',
            entry: lancy,
            arc: { id: 'g', name: '公子森林', label: '公子森林' },
            detail: { episodes: { first: 39, last: 40 } },
        },
        {
            kind: 'newArc',
            when: '2026-11-16',
            entry: lancy,
            arc: { id: 'h', name: '我心不死', label: '我心不死' },
            detail: { episodes: { first: 1, last: 5 } },
        },
        {
            kind: 'newDrama',
            when: '2026-11-20',
            entry: { kind: 'dramas', id: 'angel', name: '天使之戀系列' },
            detail: {},
        },
    ],
    timeline: [],
} as unknown as ChangeSummary;

describe('timelineModel', () => {
    it('should label the timeline', () => {
        expect(whenLabel('now')).toBe('即時上線');
        expect(whenLabel('2026-11-16')).toBe('16/11 一');
        const [episodes, arc, drama] = SUMMARY.items;
        expect(itemName(episodes!)).toBe('公子森林');
        expect(itemRange(episodes!)).toBe('39–40');
        expect(itemName(arc!)).toBe('我心不死');
        expect(itemName(drama!)).toBe('天使之戀系列');
        expect(itemRange(drama!)).toBe('');
    });

    it('should name rollbacks by the restored publish', () => {
        const item = { kind: 'rollback', when: 'now', detail: { publishId: 1 } } as const;
        expect(itemName(item)).toBe('還原至 #1');
    });
});
