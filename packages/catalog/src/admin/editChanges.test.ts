import type { CatalogEntry } from '../document/document';
import { editItemsFor, imageEditFields } from './editChanges';

const URL_A = 'https://x/a.webp';
const URL_B = 'https://x/b.webp';

const drama = (definition: Json, images: Json): CatalogEntry => ({
    id: 'g',
    definition: { name: '劇', kind: 'series', enabled: true, ...definition },
    images,
});

const ref = { kind: 'dramas', id: 'g', name: '劇' } as const;

describe('imageEditFields', () => {
    it('should report every slot that shares a changed file (W-743)', () => {
        const def = { tile: 'cover.webp', disc: 'cover.webp', arcs: [] };
        const fields = imageEditFields(
            drama(def, { 'cover.webp': URL_A }),
            drama(def, { 'cover.webp': URL_B }),
        );
        expect(fields.sort()).toEqual(['disc', 'tile']);
    });

    it('should report both arc slots and every arc sharing a file with the drama', () => {
        const arcs = [
            { id: 's1', name: 'S1', episodes: 1, tile: 'arcs/s1/x.webp', disc: 'arcs/s1/x.webp' },
            { id: 's2', name: 'S2', episodes: 1, disc: 'disc.webp' },
        ];
        const before = { 'arcs/s1/x.webp': URL_A, 'disc.webp': URL_A };
        const after = { 'arcs/s1/x.webp': URL_B, 'disc.webp': URL_B };
        const fields = imageEditFields(drama({ arcs }, before), drama({ arcs }, after));
        expect(fields.sort()).toEqual(['arcs.s1.disc', 'arcs.s1.tile', 'arcs.s2.disc', 'disc']);
    });

    it('should not report images of an arc that was removed or unlisted (W-744)', () => {
        const s2 = { id: 's2', name: 'S2', episodes: 1 };
        const images = { 'arcs/s2/tile.webp': URL_A };
        const removed = imageEditFields(drama({ arcs: [s2] }, images), drama({ arcs: [] }, {}));
        const unlisted = imageEditFields(
            drama({ arcs: [s2] }, images),
            drama({ arcs: [{ ...s2, enabled: false }] }, {}),
        );
        expect(removed).toEqual([]);
        expect(unlisted).toEqual([]);
    });

    it('should not add images when a slot points to a new file (W-744)', () => {
        const fields = imageEditFields(
            drama({ tile: 'old.webp', arcs: [] }, { 'old.webp': URL_A }),
            drama({ tile: 'new.webp', arcs: [] }, { 'new.webp': URL_B }),
        );
        expect(fields).toEqual(['tile']);
    });

    it('should keep images for files no slot points to', () => {
        const fields = imageEditFields(
            drama({ arcs: [] }, { 'extra.webp': URL_A }),
            drama({ arcs: [] }, { 'extra.webp': URL_B }),
        );
        expect(fields).toEqual(['images']);
    });
});

describe('editItemsFor', () => {
    it('should split arc fields into one item per arc, by id with dots or by name (S-999)', () => {
        const definition = {
            arcs: [{ id: 's1.v2', name: 'S1' }, { name: 'Season 2' }],
        };
        const items = editItemsFor(ref, definition, [
            'name',
            'arcs.s1.v2.tile',
            'arcs.Season 2.disc',
            'arcs.s1.v2.summary',
        ]);
        expect(items.map((i) => [i.arc?.id, i.arc?.name, i.detail.fields])).toEqual([
            [undefined, undefined, ['name']],
            ['s1.v2', 'S1', ['tile', 'summary']],
            ['Season 2', 'Season 2', ['disc']],
        ]);
    });

    it('should keep arc-shaped fields of an unknown arc on the entry item', () => {
        const items = editItemsFor(ref, { arcs: [] }, ['arcs.gone.tile']);
        expect(items.map((i) => [i.arc, i.detail.fields])).toEqual([
            [undefined, ['arcs.gone.tile']],
        ]);
    });
});
