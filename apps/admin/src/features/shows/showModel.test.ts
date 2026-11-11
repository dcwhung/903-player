import { airTimeOf, newShowDefinition, toggleDay, withOptional } from './showModel';

describe('showModel', () => {
    it('should drop empty optional fields', () => {
        expect(withOptional({ name: 'a', summary: 'x' }, 'summary', '')).toEqual({ name: 'a' });
        expect(withOptional({ name: 'a' }, 'hosts', ['甲'])).toEqual({ name: 'a', hosts: ['甲'] });
    });

    it('should toggle air days in weekday order', () => {
        expect(toggleDay([1, 5], 3)).toEqual([1, 3, 5]);
        expect(toggleDay([1, 3, 5], 3)).toEqual([1, 5]);
    });

    it('should read air time and build a new hidden show with a neutral theme', () => {
        expect(airTimeOf({ airTime: { start: '15:00', end: '16:30' } })).toEqual({
            start: '15:00',
            end: '16:30',
        });
        expect(airTimeOf({})).toBeUndefined();
        const created = newShowDefinition();
        expect(created.enabled).toBe(false);
        expect(created.theme).not.toHaveProperty('art');
    });
});
