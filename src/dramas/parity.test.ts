/*
 * 過渡期 test：搬入 folder 嘅劇集，新 registry 嘅集數 / URL / 色調必須同舊 TS 模組完全一樣
 * （URL 係已儲進度嘅 key）。舊模組刪走時連呢個 test 一齊刪。
 */
import { DRAMA_THEMES, DRAMA_TILE_ART } from '../config/dramaThemes';
import { findDrama as findOldDrama } from '../config/dramas';
import { dramaEpisodesOf as oldEpisodesOf } from '../data/dramaCatalog';
import type { ShowTheme } from '../config/showThemes';
import type { DramaId } from '../types/drama';
import { DRAMAS, dramaEpisodesOf } from './index';

/** 碟面 URL 兩邊 import 路徑唔同，唔比較 */
const withoutArt = ({ art, ...theme }: ShowTheme): Omit<ShowTheme, 'art'> => (void art, theme);

describe('folder registry parity with the legacy TS catalog', () => {
    it('matches every migrated drama episode for episode, and theme colour for colour', () => {
        DRAMAS.forEach((drama) => {
            const id = drama.id as DramaId;
            expect(dramaEpisodesOf(id)).toEqual(oldEpisodesOf(id));

            expect(withoutArt(drama.theme)).toEqual(withoutArt(DRAMA_THEMES[id]));
            expect(drama.tileArt).toBeTruthy();
            expect(DRAMA_TILE_ART[id]).toBeTruthy();

            const old = findOldDrama(id);
            expect({
                name: drama.name,
                kind: drama.kind,
                enabled: drama.enabled,
                arcUnit: drama.arcUnit,
            }).toEqual({
                name: old?.name,
                kind: old?.kind,
                enabled: old?.enabled,
                arcUnit: old?.arcUnit,
            });
        });
    });
});
