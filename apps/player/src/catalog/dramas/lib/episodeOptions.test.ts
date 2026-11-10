/* player 傳畀 @903-player/catalog 嘅錄音 base：同 v1.30（package 自己讀 BASE_URL）一模一樣，URL 唔可以變 */
import { PLAYER_EPISODE_OPTIONS } from './episodeOptions';
import { episodeOptionsFor } from './episodeOptionsFor';

describe('PLAYER_EPISODE_OPTIONS', () => {
    it('should host app audio under BASE_URL/dramas/', () => {
        expect(PLAYER_EPISODE_OPTIONS.appAudioBase).toBe(`${import.meta.env.BASE_URL}dramas/`);
    });
});

describe('episodeOptionsFor', () => {
    it('should build the same options from a base path (prebuild snapshot runs outside Vite)', () => {
        expect(episodeOptionsFor('/903-player/')).toEqual({ appAudioBase: '/903-player/dramas/' });
        expect(episodeOptionsFor(import.meta.env.BASE_URL)).toEqual(PLAYER_EPISODE_OPTIONS);
    });
});
