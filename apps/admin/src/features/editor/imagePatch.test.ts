import { imageFileFor, withImageFile } from './imagePatch';

describe('imagePatch', () => {
    it('should reuse existing file names and default to the library layout', () => {
        expect(imageFileFor({ disc: 'cover.webp' }, 'disc')).toBe('cover.webp');
        expect(imageFileFor({}, 'tile')).toBe('tile.webp');
        expect(imageFileFor({ arcs: [{ id: 'half' }] }, 'disc', 'half')).toBe(
            'arcs/half/disc.webp',
        );
    });

    it('should point the drama or the arc at the file', () => {
        expect(withImageFile({ name: 'a' }, 'disc', 'disc.webp')).toEqual({
            name: 'a',
            disc: 'disc.webp',
        });
        const def = { arcs: [{ id: 'half' }, { id: 'heart' }] };
        expect(withImageFile(def, 'tile', 'arcs/heart/tile.webp', 'heart').arcs).toEqual([
            { id: 'half' },
            { id: 'heart', tile: 'arcs/heart/tile.webp' },
        ]);
    });
});
