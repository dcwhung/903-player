import type { LoadedEntry } from '../api/types';
import type { ChangeItem } from '@903-player/catalog';
import { arcDiscOf, entryDiscOf, savedDiscOf, thumbOf } from './thumbs';

const images = { 'disc.webp': 'aaa.webp', 'arcs/a/disc.webp': 'bbb.webp' };

describe('arcDiscOf (player order: arc disc → drama disc → blank)', () => {
    it('should use the arc disc first', () => {
        expect(arcDiscOf({ disc: 'disc.webp' }, images, { disc: 'arcs/a/disc.webp' })).toBe(
            '/catalog/v1/img/bbb.webp',
        );
    });

    it('should fall back to the drama disc, then to nothing (black disc)', () => {
        expect(arcDiscOf({ disc: 'disc.webp' }, images, {})).toBe('/catalog/v1/img/aaa.webp');
        expect(arcDiscOf({}, {}, {})).toBeUndefined();
    });
});

describe('savedDiscOf (editor title disc, S-824)', () => {
    const entry = (definition: LoadedEntry['definition']): LoadedEntry => ({
        kind: 'dramas',
        id: 'lancy',
        definition,
        images,
        draft: false,
        updatedAt: 'v1',
        etag: '"v1"',
    });

    it('should use the saved disc image when the entry has one', () => {
        expect(savedDiscOf(entry({ name: '劇', disc: 'disc.webp' }))).toBe(
            '/catalog/v1/img/aaa.webp',
        );
    });

    it('should be undefined (black disc) for a new entry or one without a disc', () => {
        expect(savedDiscOf(null)).toBeUndefined();
        expect(savedDiscOf(entry({ name: '劇' }))).toBeUndefined();
    });
});

describe('change thumbs (publish timeline)', () => {
    const lancy: LoadedEntry = {
        kind: 'dramas',
        id: 'lancy',
        definition: {
            name: '蘭茜夫人劇場',
            disc: 'disc.webp',
            arcs: [
                { id: 'a', name: '戀愛二分一', disc: 'arcs/a/disc.webp' },
                { name: '我心不死', disc: 'arcs/a/disc.webp' },
                { id: 'plain', name: '公子森林' },
            ],
        },
        images,
        draft: false,
        updatedAt: 'v1',
        etag: '"v1"',
    };
    const ref = { kind: 'dramas', id: 'lancy', name: '蘭茜夫人劇場' } as const;
    const arcItem = (id: string): ChangeItem => ({
        kind: 'edit',
        when: 'now',
        entry: ref,
        arc: { id, name: id, label: id },
        detail: {},
    });

    it('should use the entry disc for the card header', () => {
        expect(entryDiscOf([lancy], ref)).toBe('/catalog/v1/img/aaa.webp');
        expect(entryDiscOf([], ref)).toBeUndefined();
    });

    it("should use the arc's own disc, matching arcs without an id by name", () => {
        expect(thumbOf([lancy], arcItem('a'))).toBe('/catalog/v1/img/bbb.webp');
        expect(thumbOf([lancy], arcItem('我心不死'))).toBe('/catalog/v1/img/bbb.webp');
    });

    it('should fall back to the drama disc for an arc without its own', () => {
        expect(thumbOf([lancy], arcItem('plain'))).toBe('/catalog/v1/img/aaa.webp');
    });
});
