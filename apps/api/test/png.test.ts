import { parsePng, PNG_HEADER_BYTES, PngError } from '../src/assets/png';
import { pngOf, pngWithoutIhdr } from './png';

describe('parsePng', () => {
    it.each([
        [64, 64],
        [512, 512],
        [1, 70000],
    ])('should read %i×%i from IHDR', (width, height) => {
        expect(parsePng(pngOf(width, height))).toEqual({ width, height });
    });

    it('should read the size from just the first PNG_HEADER_BYTES bytes (R2 range get)', () => {
        expect(parsePng(pngOf(180, 180).subarray(0, PNG_HEADER_BYTES))).toEqual({
            width: 180,
            height: 180,
        });
    });

    it.each<[string, Uint8Array]>([
        ['not a PNG', new TextEncoder().encode('<html>definitely not a png</html>')],
        ['a WebP', new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')],
        ['cut inside IHDR', pngOf(64, 64).subarray(0, 20)],
        ['IHDR that is not first', pngWithoutIhdr()],
        ['a zero width', pngOf(0, 64)],
        ['a zero height', pngOf(64, 0)],
        ['a width above 2^31 - 1', pngOf(0x80000000, 64)],
    ])('should throw PngError for %s', (_label, bytes) => {
        expect(() => parsePng(bytes)).toThrow(PngError);
    });

    it('should throw PngError when IHDR declares a length other than 13', () => {
        const bytes = pngOf(64, 64);
        bytes[11] = 12;
        expect(() => parsePng(bytes)).toThrow(/IHDR/);
    });
});
