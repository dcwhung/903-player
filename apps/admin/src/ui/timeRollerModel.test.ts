import {
    adjustEnd,
    endOptions,
    hoursOf,
    minutesOf,
    startOptions,
    withHour,
    withMinute,
} from './timeRollerModel';

describe('timeRollerModel', () => {
    it('should offer start times every 15 minutes up to 23:30', () => {
        const options = startOptions();
        expect(options[0]).toBe('00:00');
        expect(options[1]).toBe('00:15');
        expect(options.at(-1)).toBe('23:30');
        expect(options).toHaveLength(95);
    });

    it('should limit end times to start + 15 minutes .. start + 3 hours', () => {
        const options = endOptions('15:00');
        expect(options[0]).toBe('15:15');
        expect(options.at(-1)).toBe('18:00');
        expect(options).toHaveLength(12);
    });

    it('should not let the end cross midnight', () => {
        expect(endOptions('22:30').at(-1)).toBe('23:45');
    });

    it('should keep the duration when the start moves, narrowing when needed', () => {
        expect(adjustEnd('15:00', '16:30', '16:00')).toBe('17:30');
        expect(adjustEnd('15:00', '16:30', '23:00')).toBe('23:45');
        expect(adjustEnd('15:00', '14:00', '15:00')).toBe('15:15');
    });

    it('should split options into hour and minute wheels', () => {
        const options = endOptions('15:00');
        expect(hoursOf(options)).toEqual(['15', '16', '17', '18']);
        expect(minutesOf(options, '15')).toEqual(['15', '30', '45']);
        expect(minutesOf(options, '18')).toEqual(['00']);
    });

    it('should snap to the nearest minute when the hour changes', () => {
        const options = endOptions('15:00');
        expect(withHour(options, '16:45', '18')).toBe('18:00');
        expect(withHour(options, '16:30', '15')).toBe('15:30');
        expect(withMinute(options, '16:00', '45')).toBe('16:45');
    });
});
