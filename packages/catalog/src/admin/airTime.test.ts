import type { Weekday } from '../types/weekday';
import { airTimeProblem, formatAirDays, formatAirTime } from './airTime';

describe('airTimeProblem', () => {
    it.each([
        ['an ordinary slot', { start: '15:00', end: '16:30' }],
        ['midnight start', { start: '00:00', end: '00:15' }],
        ['the latest end', { start: '21:00', end: '23:45' }],
        ['exactly three hours', { start: '10:00', end: '13:00' }],
        ['one 15-minute step', { start: '12:45', end: '13:00' }],
    ])('should accept %s', (_label, value) => {
        expect(airTimeProblem(value)).toBeUndefined();
    });

    it.each([
        ['a non-object', '15:00', /must be an object/],
        ['a missing end', { start: '15:00' }, /end must be HH:MM/],
        [
            'a minute off the 15-minute grid',
            { start: '15:10', end: '16:00' },
            /start must be HH:MM/,
        ],
        ['hour 24', { start: '23:00', end: '24:00' }, /end must be HH:MM/],
        ['a single-digit hour', { start: '9:00', end: '10:00' }, /start must be HH:MM/],
        ['end equal to start', { start: '15:00', end: '15:00' }, /end must be after start/],
        ['end before start (crosses midnight)', { start: '23:00', end: '01:00' }, /after start/],
        ['more than three hours', { start: '10:00', end: '13:15' }, /within 3 hours/],
        ['an extra key', { start: '10:00', end: '11:00', note: 'x' }, /unknown key note/],
    ])('should reject %s', (_label, value, message) => {
        expect(airTimeProblem(value)).toMatch(message);
    });

    it('should leave no valid end for a 23:45 start', () => {
        expect(airTimeProblem({ start: '23:45', end: '23:45' })).toMatch(/after start/);
    });
});

describe('formatAirDays', () => {
    it.each([
        [[1, 2, 3, 4, 5], '星期一至五'],
        [[6], '星期六'],
        [[0], '星期日'],
        [[6, 0], '星期六、日'],
        [[1, 3, 5], '星期一、三、五'],
        [[0, 1, 2, 3, 4, 5, 6], '每日'],
        [[5, 1, 2, 3], '星期一至三、五'],
        [[1, 2, 6, 0], '星期一、二、六、日'],
    ] as [Weekday[], string][])('should format %j as %s', (days, text) => {
        expect(formatAirDays(days)).toBe(text);
    });
});

describe('formatAirTime', () => {
    it('should join the days and the time range', () => {
        expect(formatAirTime([1, 2, 3, 4, 5], { start: '15:00', end: '16:30' })).toBe(
            '星期一至五 15:00 - 16:30',
        );
    });

    it('should show only the days without an air time', () => {
        expect(formatAirTime([6], undefined)).toBe('星期六');
    });
});
