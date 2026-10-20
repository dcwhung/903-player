import type { Weekday } from '../types/weekday';
import { SHOWS, findShow, findShowByName, type ShowConfig } from './shows';

describe('findShowByName', () => {
    it.each([
        ['Bad Girl大過佬', 'badgirl'],
        ['Bad_Girl大過佬', 'badgirl'],
        ['  bad girl大過佬 ', 'badgirl'],
        ['雲妮鍾情', 'wanni'],
        ['雲妮鐘情', 'wanni'],
        ['公子會', 'gongzi'],
    ])('matches %s', (label, id) => {
        expect(findShowByName(label)?.id).toBe(id);
    });

    it('returns undefined for shows the app does not list', () => {
        expect(findShowByName('口水多過浪花')).toBeUndefined();
    });
});

describe('findShow', () => {
    it('finds by id', () => {
        expect(findShow('westair')?.name).toBe('西加航空');
        expect(findShow('nope')).toBeUndefined();
    });
});

describe('show names', () => {
    it('stay unique after normalisation so no alias shadows another show', () => {
        const names = SHOWS.flatMap((show) => [show.name, ...(show.aliases ?? [])]);

        expect(new Set(names.map((name) => findShowByName(name)?.id)).size).toBe(SHOWS.length);
        names.forEach((name) => expect(findShowByName(name)).toBeDefined());
    });
});

describe('ShowConfig.airDays', () => {
    it('only accepts real weekdays (0 = Sunday … 6 = Saturday)', () => {
        expectTypeOf<ShowConfig['airDays']>().toEqualTypeOf<readonly Weekday[]>();
    });
});
