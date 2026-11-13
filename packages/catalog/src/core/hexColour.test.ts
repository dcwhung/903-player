import { HEX_COLOUR_PATTERN } from './hexColour';

describe('HEX_COLOUR_PATTERN', () => {
    it.each(['#141414', '#a1B2c3', '#FFFFFF'])('should accept %s', (value) => {
        expect(HEX_COLOUR_PATTERN.test(value)).toBe(true);
    });

    it.each(['#abc', 'a1b2c3', '#a1b2c3d', '#gggggg', '#a1b2c', ' #a1b2c3'])(
        'should reject %s',
        (value) => {
            expect(HEX_COLOUR_PATTERN.test(value)).toBe(false);
        },
    );

    it('should capture the three channels in order', () => {
        expect(HEX_COLOUR_PATTERN.exec('#ff8000')?.slice(1)).toEqual(['ff', '80', '00']);
    });
});
