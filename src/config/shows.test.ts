import type { Weekday } from '../types/weekday';
import { airsWeekly, findShow, SHOWS, type ShowConfig } from './shows';

describe('findShow', () => {
    it('finds by id', () => {
        expect(findShow('westair')?.name).toBe('西加航空');
        expect(findShow('nope')).toBeUndefined();
    });
});

describe('ShowConfig.airDays', () => {
    it('only accepts real weekdays (0 = Sunday … 6 = Saturday)', () => {
        expectTypeOf<ShowConfig['airDays']>().toEqualTypeOf<readonly Weekday[]>();
    });
});

describe('airsWeekly', () => {
    it('is true only for shows that air one day a week', () => {
        expect(airsWeekly(findShow('gongzi') as ShowConfig)).toBe(true);
        expect(airsWeekly(findShow('westair') as ShowConfig)).toBe(true);
        expect(airsWeekly(findShow('badgirl') as ShowConfig)).toBe(false);
    });
});

describe('SHOWS', () => {
    it('should fill the landscape home grid exactly: seven shows plus the today tile', () => {
        // ShowGrid.module.css 橫版寫死 4 欄 × 2 行（手機打橫連橫額 5 欄 × 2 行），唔分頁；
        // 加減節目要一齊改嗰度嘅欄數，否則第三行會畀剪走
        const LANDSCAPE_GRID_TILES = 8;

        expect(SHOWS.length + 1).toBe(LANDSCAPE_GRID_TILES);
    });
});
