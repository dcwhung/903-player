import type { SeriesEpisode } from '@903-player/catalog';
import type { Progress } from '../services/progressStore';
import { liveSeriesContinue } from './continueListening';

const TODAY = '2026-11-05';

const ep = (no: number, extra: Partial<SeriesEpisode> = {}): SeriesEpisode => ({
    kind: 'series',
    dramaId: 'lancy',
    id: `id:/half/${no}`,
    url: `/half/${no}`,
    arc: '戀愛二分一',
    no,
    ...extra,
});

const partway: Progress = { position: 250, duration: 1000, watched: false, updatedAt: 1 };

describe('liveSeriesContinue', () => {
    it('should continue the episode heard last when it is still on the shelf', () => {
        const catalog = [ep(1), ep(2), ep(3)];
        expect(liveSeriesContinue(catalog, { [ep(2).id]: partway }, TODAY)).toEqual({
            episode: catalog[1],
            ratio: 0.25,
        });
    });

    it('should skip to the next episode still on the shelf when that one was removed', () => {
        const gone = { removedAt: '2026-11-01' };
        const catalog = [ep(1, gone), ep(2, gone), ep(3)];
        expect(liveSeriesContinue(catalog, { [ep(2).id]: partway }, TODAY)).toEqual({
            episode: catalog[2],
            ratio: 0,
        });
    });

    it('should give nothing when every later episode was removed, or not out yet', () => {
        const catalog = [
            ep(1),
            ep(2, { removedAt: '2026-11-01' }),
            ep(3, { addedAt: '2026-11-19' }),
        ];
        expect(liveSeriesContinue(catalog, { [ep(2).id]: partway }, TODAY)).toBeUndefined();
    });
});
