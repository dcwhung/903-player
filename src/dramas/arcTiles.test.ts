/* 短篇長方形圖 regression：R2 有短篇 cover 嘅劇，每個短篇都要有自己嘅 tile（暫時未用，留底防將來要） */
import { arcTileFor, findDrama, seriesEpisodesOf } from './index';

/** R2 每個短篇都有 cover photo 嘅劇；芝See 嘅短篇冇 cover，所以唔喺度 */
const WITH_ARC_COVERS = ['golden', 'sammy-kitty', 'jim', 'lancy'];

const arcsOf = (id: string) => [...new Set(seriesEpisodesOf(id).map((e) => e.arc))];

describe('arc tiles', () => {
    it.each(WITH_ARC_COVERS)(
        'gives every arc of %s its own tile, apart from the drama tile',
        (id) => {
            const tiles = arcsOf(id).map((arc) => arcTileFor(id, arc));
            expect(tiles.every(Boolean)).toBe(true);
            expect(new Set(tiles).size).toBe(tiles.length);
            expect(tiles).not.toContain(findDrama(id)?.tileArt);
        },
    );

    it('leaves 芝See without arc tiles, as R2 has no 短篇 covers for it', () => {
        expect(
            arcsOf('chisee')
                .map((arc) => arcTileFor('chisee', arc))
                .some(Boolean),
        ).toBe(false);
    });
});
