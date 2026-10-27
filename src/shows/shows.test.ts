/* 7 個 903 節目 regression：名 / 時間 / 播出日 唔可以變（錄音 URL 由 name + fileTime 砌，係已儲進度嘅 key） */
import { NEUTRAL_THEME, themeVars } from '../config/showThemes';
import type { Weekday } from '../types/weekday';
import { airsWeekly, findShow, SHOWS, themeFor, type ShowConfig } from './index';

const MONDAY_TO_FRIDAY: readonly Weekday[] = [1, 2, 3, 4, 5];
const SATURDAY: readonly Weekday[] = [6];

describe('SHOWS', () => {
    it('lists the seven shows in home-page order with their file times and air days', () => {
        expect(
            SHOWS.map(({ id, name, fileTime, airDays }) => ({ id, name, fileTime, airDays })),
        ).toEqual([
            { id: 'badgirl', name: 'Bad Girl大過佬', fileTime: '1009', airDays: MONDAY_TO_FRIDAY },
            { id: 'gongzi', name: '公子會', fileTime: '2308', airDays: SATURDAY },
            { id: 'wanni', name: '雲妮鍾情', fileTime: '0708', airDays: MONDAY_TO_FRIDAY },
            {
                id: 'sunnyday',
                name: '在晴朗的一天出發',
                fileTime: '0809',
                airDays: MONDAY_TO_FRIDAY,
            },
            { id: 'westair', name: '西加航空', fileTime: '0905', airDays: SATURDAY },
            { id: 'waves', name: '口水多過浪花', fileTime: '1510', airDays: MONDAY_TO_FRIDAY },
            { id: 'lalala', name: '聖艾粒LaLaLaLa', fileTime: '1710', airDays: MONDAY_TO_FRIDAY },
        ]);
    });

    it('should fill the landscape home grid exactly: seven shows plus the today tile', () => {
        // ShowGrid.module.css 橫版寫死 4 欄 × 2 行（手機打橫連橫額 5 欄 × 2 行），唔分頁；
        // 加減節目要一齊改嗰度嘅欄數，否則第三行會畀剪走
        const LANDSCAPE_GRID_TILES = 8;
        expect(SHOWS.length + 1).toBe(LANDSCAPE_GRID_TILES);
    });

    it('gives every show artwork and a dark theme with hex colours', () => {
        SHOWS.forEach((show) => {
            expect(show.theme.art).toBeTruthy();
            expect(show.theme.accent).toMatch(/^#[0-9a-f]{6}$/i);
            expect(show.theme.scheme).toBeUndefined();
        });
        expect(new Set(SHOWS.map((s) => s.theme.art)).size).toBe(SHOWS.length);
    });

    it('keeps a separate home tile from the disc for every show', () => {
        SHOWS.forEach((show) => {
            expect(show.tileArt).toBeTruthy();
            expect(show.tileArt).not.toBe(show.theme.art);
        });
        expect(new Set(SHOWS.map((s) => s.tileArt)).size).toBe(SHOWS.length);
    });
});

describe('findShow / themeFor', () => {
    it('finds by id and falls back to the neutral theme', () => {
        expect(findShow('westair')?.name).toBe('西加航空');
        expect(findShow('nope')).toBeUndefined();
        expect(themeFor(undefined)).toBe(NEUTRAL_THEME);
        expect(themeFor('nope')).toBe(NEUTRAL_THEME);
        expect(themeFor('gongzi')).toBe(findShow('gongzi')?.theme);
    });

    it('keeps the 公子會 and Bad Girl colours', () => {
        expect(themeFor('gongzi')).toMatchObject({ bg: '#111111', accent: '#d4af5a' });
        const vars = themeVars(themeFor('badgirl'));
        expect(vars['--theme-bg']).toBe('#21151a');
        expect(vars['--theme-accent']).toBe('#f08a24');
    });
});

describe('airsWeekly', () => {
    it('is true only for shows that air one day a week', () => {
        expect(airsWeekly(findShow('gongzi') as ShowConfig)).toBe(true);
        expect(airsWeekly(findShow('westair') as ShowConfig)).toBe(true);
        expect(airsWeekly(findShow('badgirl') as ShowConfig)).toBe(false);
    });
});
