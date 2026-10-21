import type { Weekday } from '../types/weekday';
import { airsWeekly, findShow, type ShowConfig } from './shows';

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
