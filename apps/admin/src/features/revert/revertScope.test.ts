import type { LoadedEntry } from '../../api/types';
import { changedFields, fieldChanged, scopeOf } from './revertScope';

const entry = (over: Partial<LoadedEntry> = {}): LoadedEntry => ({
    kind: 'dramas',
    id: 'lancy',
    definition: {
        name: '蘭茜夫人劇場',
        summary: '新簡介',
        disc: 'disc.webp',
        arcs: [
            { id: 'half', name: '戀愛二分一', summary: '新', tile: 'arcs/half/tile.webp' },
            { name: '我心不死', episodes: 3 },
            { id: 'new', name: '新短篇' },
        ],
    },
    images: { 'disc.webp': 'd2.webp', 'arcs/half/tile.webp': 't2.webp' },
    draft: false,
    updatedAt: 'v2',
    etag: '"v2"',
    publishedVersion: {
        definition: {
            name: '蘭茜夫人劇場',
            summary: '舊簡介',
            disc: 'disc.webp',
            arcs: [
                { id: 'half', name: '戀愛二分一', summary: '舊', tile: 'arcs/half/tile.webp' },
                { name: '我心不死', episodes: 3 },
            ],
        },
        images: { 'disc.webp': 'd1.webp', 'arcs/half/tile.webp': 't1.webp' },
    },
    ...over,
});

describe('revertScope', () => {
    it('should find changed top-level fields, counting a swapped image as its slot', () => {
        expect(changedFields(scopeOf(entry()))).toEqual(['disc', 'summary']);
    });

    it('should never offer arcs / images at the top level', () => {
        const scope = scopeOf(entry());
        expect(fieldChanged(scope, 'arcs')).toBe(false);
        expect(fieldChanged(scope, 'images')).toBe(false);
    });

    it('should never offer new episodes, on an arc or a daily drama (S-1008)', () => {
        const more = entry({
            definition: {
                name: '每日',
                episodeDates: ['2026-11-14', '2026-11-15'],
                arcs: [{ name: '我心不死', episodes: 5, episodeDates: ['2026-11-15'] }],
            },
            images: {},
            publishedVersion: {
                definition: {
                    name: '每日',
                    episodeDates: ['2026-11-14'],
                    arcs: [{ name: '我心不死', episodes: 3 }],
                },
                images: {},
            },
        });
        expect(changedFields(scopeOf(more))).toEqual([]);
        expect(changedFields(scopeOf(more, '我心不死'))).toEqual([]);
        expect(fieldChanged(scopeOf(more, '我心不死'), 'episodes')).toBe(false);
    });

    it('should compare an arc by id, or by name when it has no id', () => {
        expect(changedFields(scopeOf(entry(), 'half'))).toEqual(['tile', 'summary']);
        expect(changedFields(scopeOf(entry(), '我心不死'))).toEqual([]);
    });

    it('should offer nothing for never-published entries and arcs', () => {
        expect(scopeOf(entry({ publishedVersion: undefined }))).toBeNull();
        expect(scopeOf(entry(), 'new')).toBeNull();
        expect(changedFields(null)).toEqual([]);
    });

    it('should use the conventional file when a slot is not written', () => {
        const scope = scopeOf(
            entry({
                definition: { name: 'x' },
                images: { 'tile.webp': 'b.webp' },
                publishedVersion: { definition: { name: 'x' }, images: { 'tile.webp': 'a.webp' } },
            }),
        );
        expect(changedFields(scope)).toEqual(['tile']);
    });
});
