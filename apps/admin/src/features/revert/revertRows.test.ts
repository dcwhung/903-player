import type { ChangeItem } from '@903-player/catalog';
import type { LoadedEntry } from '../../api/types';
import { timelineRevertOf } from './revertRows';
import { valueText } from './revertValues';

const lancy = { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' } as const;
const half = { id: 'half', name: '戀愛二分一', label: '戀愛二分一' };

const entry: LoadedEntry = {
    kind: 'dramas',
    id: 'lancy',
    definition: {
        name: '蘭茜夫人劇場',
        summary: '新',
        enabled: false,
        arcs: [{ id: 'half', name: '戀愛二分一', summary: '新', tile: 'arcs/half/tile.webp' }],
    },
    images: { 'arcs/half/tile.webp': 'new.webp' },
    draft: false,
    updatedAt: 'v2',
    etag: '"v2"',
    publishedVersion: {
        definition: {
            name: '蘭茜夫人劇場',
            summary: '舊',
            enabled: true,
            arcs: [
                { id: 'half', name: '戀愛二分一', summary: '舊', tile: 'arcs/half/tile.webp' },
                { id: 'gone', name: '已刪' },
            ],
        },
        images: { 'arcs/half/tile.webp': 'old.webp' },
    },
};

const item = (over: Partial<ChangeItem>): ChangeItem => ({
    kind: 'edit',
    when: 'now',
    entry: lancy,
    detail: {},
    ...over,
});

describe('timelineRevertOf', () => {
    it('should list each changed arc field with published / current values', () => {
        const target = timelineRevertOf(
            item({ arc: half, detail: { fields: ['tile', 'summary'] } }),
            [entry],
        );
        expect(target?.name).toBe('戀愛二分一');
        expect(target?.rows.map((row) => row.label)).toEqual(['橫圖', '簡介']);
        expect(target?.rows[0]?.item).toEqual({ arc: 'half', field: 'tile' });
        expect(target?.rows[0]?.values?.published).toEqual({
            kind: 'image',
            slot: 'tile',
            url: '/catalog/v1/img/old.webp',
        });
        expect(target?.rows[1]?.values).toEqual({
            published: { kind: 'text', text: '舊' },
            current: { kind: 'text', text: '新' },
        });
    });

    it('should skip fields it cannot revert (images, legacy arcs.<id>.<key>)', () => {
        const target = timelineRevertOf(
            item({ detail: { fields: ['images', 'arcs.half.summary', 'summary'] } }),
            [entry],
        );
        expect(target?.rows.map((row) => row.item)).toEqual([{ field: 'summary' }]);
        expect(timelineRevertOf(item({ detail: { fields: ['images'] } }), [entry])).toBeNull();
    });

    it('should turn unlist rows into one 恢復上架 item per reason', () => {
        const relist = (over: Partial<ChangeItem>) =>
            timelineRevertOf(item({ kind: 'unlist', ...over }), [entry])?.rows.map((r) => [
                r.label,
                r.item,
            ]);
        expect(relist({ detail: { reason: 'disabled' } })).toEqual([
            ['恢復上架', { field: 'enabled' }],
        ]);
        expect(relist({ arc: half, detail: { reason: 'removedAt' } })).toEqual([
            ['恢復上架', { arc: 'half', field: 'removedAt' }],
        ]);
        expect(
            relist({
                arc: { id: 'gone', name: '已刪', label: '已刪' },
                detail: { reason: 'deleted' },
            }),
        ).toEqual([['恢復上架', { arc: 'gone', field: '*' }]]);
    });

    it('should offer nothing for new items, removed episodes, deleted entries or unpublished arcs', () => {
        expect(timelineRevertOf(item({ kind: 'newArc', arc: half }), [entry])).toBeNull();
        const episodes = { reason: 'deleted' as const, episodes: { first: 1, last: 2 } };
        expect(
            timelineRevertOf(item({ kind: 'unlist', arc: half, detail: episodes }), [entry]),
        ).toBeNull();
        expect(
            timelineRevertOf(item({ kind: 'unlist', detail: { reason: 'deleted' } }), []),
        ).toBeNull();
        const fresh = { id: 'fresh', name: '新', label: '新' };
        expect(
            timelineRevertOf(item({ kind: 'unlist', arc: fresh, detail: { reason: 'disabled' } }), [
                entry,
            ]),
        ).toBeNull();
        const unpublished = { ...entry, publishedVersion: undefined };
        expect(
            timelineRevertOf(item({ detail: { fields: ['summary'] } }), [unpublished]),
        ).toBeNull();
    });
});

describe('valueText', () => {
    it('should write empty, listing, days, times and long text readably', () => {
        expect(valueText('summary', undefined)).toBe('（未設定）');
        expect(valueText('enabled', false)).toBe('下架');
        expect(valueText('airDays', [1, 2])).toBe('一、二');
        expect(valueText('airTime', { start: '15:00', end: '16:30' })).toBe('15:00–16:30');
        expect(valueText('hosts', ['森美', '小儀'])).toBe('森美、小儀');
        expect(valueText('summary', 'x'.repeat(130))).toHaveLength(121);
    });
});
