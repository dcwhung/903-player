/* 過渡期：folder registry 必須同舊 TS config 一樣（name / fileTime / airDays / 色調）。舊模組刪走時一齊刪 */
import { SHOWS as OLD_SHOWS } from '../config/shows';
import { SHOW_THEMES } from '../config/showThemes';
import type { ShowId } from '../types/recording';
import { SHOWS } from './index';

describe('show registry parity with the legacy TS config', () => {
    it('matches every show field for field, and theme colour for colour', () => {
        expect(SHOWS.map((s) => s.id)).toEqual(OLD_SHOWS.map((s) => s.id));
        SHOWS.forEach((show) => {
            const old = OLD_SHOWS.find((s) => s.id === show.id);
            expect({ name: show.name, fileTime: show.fileTime, airDays: show.airDays }).toEqual({
                name: old?.name,
                fileTime: old?.fileTime,
                airDays: old?.airDays,
            });
            const { art: _newArt, ...newTheme } = show.theme;
            const { art: _oldArt, ...oldTheme } = SHOW_THEMES[show.id as ShowId];
            void _newArt;
            void _oldArt;
            expect(newTheme).toEqual(oldTheme);
        });
    });
});
