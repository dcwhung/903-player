import type { ChangesResponse, TodoRow } from '../../api/types';
import { skipCardsOf, skippedRows, skipReason } from './skipModel';

const NA = { state: 'na' } as const;
const DONE = { state: 'done' } as const;
const MUST = { state: 'must', target: '/dramas/sammy/schedule#camp' } as const;

const row = (over: Partial<TodoRow>): TodoRow => ({
    key: 'newArc/lancy/love-after',
    publish: 'selectable',
    kind: 'newArc',
    findingIds: [1],
    dramaId: 'lancy',
    arcId: 'love-after',
    name: '蘭茜夫人劇場 · 戀愛後二分一',
    cells: { folder: DONE, id: DONE, images: DONE, schedule: DONE, summary: NA },
    ...over,
});

const LOVE = row({});
const CAMP = row({
    key: 'newArc/sammy/camp',
    publish: 'incomplete',
    dramaId: 'sammy',
    arcId: 'camp',
    name: '森美小儀系列 · 大衛營',
    cells: { ...LOVE.cells, schedule: MUST },
});
const SAMMY2 = row({
    key: 'newArc/sammy/party',
    publish: 'incomplete',
    dramaId: 'sammy',
    arcId: 'party',
    name: '森美小儀系列 · 開派對',
    cells: { ...LOVE.cells, id: MUST, schedule: MUST },
});

const data = (skipped: string[] = []): ChangesResponse => ({
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 1 },
    selection: { content: [], skipped: skipped.map((key) => ({ key, reason: 'incomplete' })) },
});

describe('skipModel', () => {
    it('should take incomplete todo rows plus picks the server skipped', () => {
        expect(skippedRows([LOVE, CAMP], data()).map((r) => r.key)).toEqual([CAMP.key]);
        expect(skippedRows([LOVE, CAMP], data([LOVE.key])).map((r) => r.key)).toEqual([
            LOVE.key,
            CAMP.key,
        ]);
        expect(skippedRows([LOVE], undefined)).toEqual([]);
    });

    it('should group rows by drama in first-seen order, with the drama and arc names', () => {
        const cards = skipCardsOf([CAMP, LOVE, SAMMY2]);
        expect(cards.map((c) => [c.dramaId, c.name])).toEqual([
            ['sammy', '森美小儀系列'],
            ['lancy', '蘭茜夫人劇場'],
        ]);
        expect(cards[0]?.rows.map((r) => r.arcName)).toEqual(['大衛營', '開派對']);
    });

    it('should name a new drama row by itself with no arc name', () => {
        const drama = row({ kind: 'newDrama', arcId: null, name: '新劇集', dramaId: 'fresh' });
        const [card] = skipCardsOf([drama]);
        expect(card?.name).toBe('新劇集');
        expect(card?.rows[0]?.arcName).toBe('');
    });

    it('should give the missing settings as the reason, or nothing when none is missing', () => {
        expect(skipReason(CAMP)).toBe('尚未設定排期');
        expect(skipReason(SAMMY2)).toBe('尚未設定ID、排期');
        expect(skipReason(LOVE)).toBe('');
    });
});
