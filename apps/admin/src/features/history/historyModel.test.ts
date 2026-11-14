import type { ChangeItem } from '@903-player/catalog';
import { bannerChangedOf, contentChangedOf, historyName, itemStatusOf } from './historyModel';

const entry = { kind: 'dramas', id: 'golden', name: '黃金少年' } as const;
const arc = { id: 's1', name: 'Season 1', label: 'Season 1' };

describe('historyModel', () => {
    it('should describe each change with the list pill wording', () => {
        const items: ChangeItem[] = [
            {
                kind: 'newEpisodes',
                when: 'now',
                entry,
                detail: { episodes: { first: 39, last: 40 } },
            },
            { kind: 'newDrama', when: '2026-11-20', entry, detail: {} },
            {
                kind: 'newArc',
                when: '2026-11-16',
                entry,
                arc,
                detail: { dates: ['2026-11-16', '2026-11-18'] },
            },
            { kind: 'unlist', when: '2026-11-03', entry, arc, detail: { reason: 'removedAt' } },
            { kind: 'unlist', when: 'now', entry, detail: { reason: 'disabled' } },
        ];
        expect(items.map((item) => itemStatusOf(item, [])?.text)).toEqual([
            '＋2 集 · 已上架',
            '11 月 20 日上架',
            '排程中 · 11 月 16 日起',
            '已下架 · 11 月 3 日',
            '已下架',
        ]);
    });

    it('should label edits by field and name arcs with their drama', () => {
        const edit: ChangeItem = {
            kind: 'edit',
            when: 'now',
            entry,
            arc,
            detail: { fields: ['summary', 'zzz'] },
        };
        // 認不到嘅欄位寫「其他」，同確認發佈頁一樣
        expect(itemStatusOf(edit, [])?.text).toBe('簡介、其他');
        expect(historyName(edit)).toBe('黃金少年 › Season 1');
        expect(historyName({ kind: 'rollback', when: 'now', detail: { publishId: 1 } })).toBe(
            '還原至 #1',
        );
    });
});

describe('bannerChangedOf', () => {
    it('should be true only when the publish changes say the banner changed', () => {
        const changes = { items: [], timeline: [] };
        expect(bannerChangedOf({ ...changes, bannerChanged: true })).toBe(true);
        expect(bannerChangedOf({ ...changes, bannerChanged: false })).toBe(false);
        // 舊 api（< 0.8.1）/ 舊記錄冇呢個欄位 → 當冇改
        expect(bannerChangedOf(changes)).toBe(false);
        expect(bannerChangedOf(undefined)).toBe(false);
    });
});

// 用戶 2026-11-13：「N 節目 · N 劇 · N 集」只喺呢次改咗節目 / 劇內容先顯示
describe('contentChangedOf', () => {
    const item = { kind: 'unlist', when: 'now', entry, detail: {} } as ChangeItem;

    it('should be true only when the publish changed shows / dramas', () => {
        expect(contentChangedOf({ items: [item], timeline: [] })).toBe(true);
        expect(contentChangedOf({ items: [], timeline: [], bannerChanged: true })).toBe(false);
        expect(contentChangedOf({ items: [], timeline: [], brandingChanged: true })).toBe(false);
        expect(contentChangedOf({ items: [], timeline: [] })).toBe(false);
    });

    it('should keep the stats for an old record without a change summary', () => {
        expect(contentChangedOf(undefined)).toBe(true);
    });
});
