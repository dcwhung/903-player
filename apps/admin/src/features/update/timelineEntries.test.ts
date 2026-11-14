import type { ChangeItem } from '@903-player/catalog';
import type { LoadedEntry } from '../../api/types';
import {
    cardRows,
    entryCardsOf,
    groupHeading,
    rowExtra,
    rowLevel,
    toneOf,
} from './timelineEntries';

const lancy = { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' } as const;
const waves = { kind: 'shows', id: 'waves', name: '口水多過浪花' } as const;
const arc = { id: 'love', name: '戀愛二分一', label: '戀愛二分一' };

const item = (over: Partial<ChangeItem>): ChangeItem => ({
    kind: 'edit',
    when: 'now',
    entry: lancy,
    detail: {},
    ...over,
});

describe('entryCardsOf', () => {
    it('should group items by entry (kind + id) in first-appearance order', () => {
        const items = [
            item({ detail: { fields: ['disc'] } }),
            item({ entry: waves }),
            item({ arc, detail: { fields: ['tile'] } }),
            item({ entry: { ...lancy, kind: 'shows' } }),
        ];
        const cards = entryCardsOf(items);
        expect(cards.map((c) => c.key)).toEqual(['dramas/lancy', 'shows/waves', 'shows/lancy']);
        expect(cards[0]!.items).toEqual([items[0], items[2]]);
        expect(cards[0]!.entry).toEqual(lancy);
    });

    it('should give an item without an entry (rollback) a card of its own', () => {
        const rollback: ChangeItem = { kind: 'rollback', when: 'now', detail: { publishId: 3 } };
        const cards = entryCardsOf([rollback, rollback]);
        expect(cards).toHaveLength(2);
        expect(cards[0]!.entry).toBeUndefined();
    });
});

describe('cardRows', () => {
    it('should keep one 新劇 row: its new arcs / episodes in the same group are covered by 全 N 集', () => {
        const items = [
            item({ kind: 'newDrama' }),
            item({ kind: 'newArc', arc, detail: { episodes: { first: 1, last: 5 } } }),
            item({ kind: 'newEpisodes', arc }),
        ];
        expect(cardRows(entryCardsOf(items)[0]!)).toEqual([items[0]]);
    });

    it('should keep every row of an existing entry', () => {
        const items = [item({}), item({ kind: 'newArc', arc })];
        expect(cardRows(entryCardsOf(items)[0]!)).toEqual(items);
    });
});

describe('toneOf', () => {
    it('should colour 修改 warn, 下架 danger and new things ok', () => {
        expect(toneOf('edit')).toBe('edit');
        expect(toneOf('unlist')).toBe('off');
        expect(
            ['newShow', 'newDrama', 'newArc', 'newEpisodes'].map((k) => toneOf(k as never)),
        ).toEqual(['new', 'new', 'new', 'new']);
    });
});

describe('groupHeading', () => {
    it('should say 即時上線 (按「發佈」後) for now', () => {
        expect(groupHeading('now', '2026-11-14')).toEqual({
            label: '即時上線',
            sub: '按「發佈」後',
        });
    });

    it('should write the date with the weekday, adding the year only for another year', () => {
        expect(groupHeading('2026-11-16', '2026-11-14')).toEqual({
            label: '11 月 16 日',
            sub: '星期一',
        });
        expect(groupHeading('2027-01-03', '2026-11-14').label).toBe('2027 年 1 月 3 日');
    });
});

describe('rowLevel', () => {
    it('should call an entry-level row 劇集 / 節目, and say nothing for arcs or new entries', () => {
        expect(rowLevel(item({}))).toBe('劇集');
        expect(rowLevel(item({ entry: waves, kind: 'unlist' }))).toBe('節目');
        expect(rowLevel(item({ arc }))).toBe('');
        expect(rowLevel(item({ kind: 'newDrama' }))).toBe('');
        expect(rowLevel(item({ kind: 'newShow', entry: waves }))).toBe('');
    });
});

describe('rowExtra', () => {
    const entries = [
        {
            kind: 'dramas',
            id: 'lancy',
            definition: { name: '蘭茜夫人劇場', arcs: [{ episodes: 20 }, { episodes: 12 }] },
            images: {},
        },
    ] as unknown as LoadedEntry[];

    it('should write an episode range as 第 39–40 集', () => {
        const range = { episodes: { first: 39, last: 40 } };
        expect(rowExtra(item({ kind: 'newEpisodes', arc, detail: range }), [])).toBe('第 39–40 集');
        const single = { episodes: { first: 7, last: 7 } };
        expect(rowExtra(item({ kind: 'newEpisodes', arc, detail: single }), [])).toBe('第 7 集');
    });

    it('should give a new drama its episode total', () => {
        expect(rowExtra(item({ kind: 'newDrama' }), entries)).toBe('全 32 集');
    });

    it('should count new daily episodes and leave other rows empty', () => {
        const dates = { dates: ['2026-11-14', '2026-11-15'] };
        expect(rowExtra(item({ kind: 'newEpisodes', detail: dates }), [])).toBe('2 集');
        expect(rowExtra(item({ kind: 'unlist', arc }), [])).toBe('');
    });
});
