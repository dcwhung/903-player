import type { LoadedEntry } from '../api/types';
import { arcDiscOf, savedDiscOf } from './thumbs';

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
