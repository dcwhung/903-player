import { nosOfRangeKey } from './episodeRangeKey';

describe('nosOfRangeKey', () => {
    it('should expand a range key and a single episode key', () => {
        expect(nosOfRangeKey('1-3')).toEqual([1, 2, 3]);
        expect(nosOfRangeKey('6')).toEqual([6]);
    });

    it('should ignore keys that are not episode ranges', () => {
        expect(nosOfRangeKey('abc')).toEqual([]);
    });
});
