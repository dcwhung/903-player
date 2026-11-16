import type { CatalogEntry } from '../document/document';
import { summarizeChanges } from './changes';
import type { ChangeDocument } from './changeTypes';

const TODAY = '2026-11-14';

type Json = Record<string, unknown>;

const show = (id: string, patch: Json = {}): CatalogEntry => ({
    id,
    definition: { name: `節目${id}`, fileTime: '1000', airDays: [1], ...patch },
    images: {},
});

const drama = (id: string, patch: Json = {}): CatalogEntry => ({
    id,
    definition: { name: `劇${id}`, kind: 'series', enabled: true, arcs: [], ...patch },
    images: {},
});

const doc = (shows: CatalogEntry[], dramas: CatalogEntry[] = []): ChangeDocument => ({
    shows,
    dramas,
});

const reorder = (list: 'shows' | 'dramas') => ({ kind: 'reorder', when: 'now', detail: { list } });

describe('summarizeChanges reorder (#6)', () => {
    it('should report one reorder item and no per-entry edits after a drag', () => {
        const prev = doc([
            show('a', { order: 1 }),
            show('b', { order: 2 }),
            show('c', { order: 3 }),
        ]);
        const next = doc([
            show('a', { order: 3 }),
            show('b', { order: 1 }),
            show('c', { order: 2 }),
        ]);
        const { items, timeline } = summarizeChanges(prev, next, TODAY);
        expect(items).toEqual([reorder('shows')]);
        expect(timeline).toEqual([{ when: 'now', items: [reorder('shows')] }]);
    });

    it('should sort like the player: no order goes last, ties by id', () => {
        const prev = doc([], [drama('b'), drama('a')]);
        const same = doc([], [drama('a', { order: 2 }), drama('b')]);
        const moved = doc([], [drama('b', { order: 1 })]).dramas.concat(drama('a'));
        expect(summarizeChanges(prev, same, TODAY).items).toEqual([]);
        expect(summarizeChanges(prev, doc([], moved), TODAY).items).toEqual([reorder('dramas')]);
    });

    it('should ignore renumbering, new / removed entries and unlisted entries', () => {
        const prev = doc([show('a', { order: 1 }), show('b', { order: 2 })]);
        const next = doc([
            show('n', { order: 1 }),
            show('a', { order: 5 }),
            show('b', { order: 9 }),
            show('off', { order: 0, enabled: false }),
        ]);
        expect(summarizeChanges(prev, next, TODAY).items.map((i) => i.kind)).toEqual(['newShow']);
    });

    it('should not report a reorder on the first publish', () => {
        const next = doc([show('a', { order: 2 }), show('b', { order: 1 })]);
        expect(summarizeChanges(null, next, TODAY).items.map((i) => i.kind)).toEqual([
            'newShow',
            'newShow',
        ]);
    });

    it('should put reorder items first in the now group (after rollback), shows before dramas', () => {
        const prev = doc(
            [show('a', { order: 1 }), show('b', { order: 2 })],
            [drama('x', { order: 1 }), drama('y', { order: 2 })],
        );
        const next = doc(
            [show('a', { order: 2 }), show('b', { order: 1 }), show('c')],
            [drama('x', { order: 2, name: '新名' }), drama('y', { order: 1 })],
        );
        const items = summarizeChanges(prev, next, TODAY, { rollbackOf: 3 }).items;
        expect(items.map((i) => [i.kind, i.detail.list ?? i.entry?.id ?? ''])).toEqual([
            ['rollback', ''],
            ['reorder', 'shows'],
            ['reorder', 'dramas'],
            ['newShow', 'c'],
            ['edit', 'x'],
        ]);
        expect(items[4]?.detail.fields).toEqual(['name']);
    });
});
