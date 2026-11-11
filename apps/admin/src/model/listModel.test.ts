import type { ChangeSummary } from '@903-player/catalog';
import { changeFlagsOf, groupEntries, type CatalogItem } from './listModel';

const item = (over: Partial<CatalogItem>): CatalogItem => ({
    kind: 'dramas',
    id: 'x',
    definition: { enabled: true },
    images: {},
    draft: false,
    updatedAt: '',
    etag: null,
    ...over,
});

describe('groupEntries', () => {
    it('should split listed (by order) from drafts and unlisted entries', () => {
        const groups = groupEntries([
            item({ id: 'b', definition: { enabled: true, order: 2 } }),
            item({ id: 'off', definition: { enabled: false, order: 1 } }),
            item({ id: 'a', definition: { enabled: true, order: 1 } }),
            item({ id: 'new', definition: { enabled: false }, draft: true }),
        ]);
        expect(groups.listed.map((e) => e.id)).toEqual(['a', 'b']);
        expect(groups.pending.map((e) => e.id)).toEqual(['new']);
        expect(groups.unlisted.map((e) => e.id)).toEqual(['off']);
    });

    it('should list shows unless enabled is false', () => {
        const groups = groupEntries([
            item({ kind: 'shows', id: 's', definition: {} }),
            item({ kind: 'shows', id: 'off', definition: { enabled: false } }),
        ]);
        expect(groups.listed.map((e) => e.id)).toEqual(['s']);
        expect(groups.unlisted.map((e) => e.id)).toEqual(['off']);
    });
});

describe('changeFlagsOf', () => {
    it('should flag pending edits, never-published entries and new arcs', () => {
        const summary = {
            items: [
                {
                    kind: 'edit',
                    when: 'now',
                    entry: { kind: 'dramas', id: 'lancy', name: 'L' },
                    detail: {},
                },
                {
                    kind: 'newDrama',
                    when: 'now',
                    entry: { kind: 'dramas', id: 'angel', name: 'A' },
                    detail: {},
                },
                {
                    kind: 'newArc',
                    when: '2026-11-16',
                    entry: { kind: 'dramas', id: 'lancy', name: 'L' },
                    arc: { id: 'heart', name: '我心不死', label: '我心不死' },
                    detail: {},
                },
            ],
            timeline: [],
        } as unknown as ChangeSummary;
        const flags = changeFlagsOf(summary);
        expect(flags.pending.has('dramas:lancy')).toBe(true);
        expect(flags.never.has('dramas:angel')).toBe(true);
        expect(flags.pending.has('dramas:angel')).toBe(false);
        expect(flags.newArcs.has('lancy:heart')).toBe(true);
    });
});
