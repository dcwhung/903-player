import { arcDiscOf } from './thumbs';

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
