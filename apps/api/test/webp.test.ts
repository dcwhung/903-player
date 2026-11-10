import { parseWebp, WebpError } from '../src/assets/webp';
import { webpVp8, webpVp8l, webpVp8x } from './webp';

const ascii = (text: string) => new TextEncoder().encode(text);

describe('parseWebp', () => {
    it('should read the dimensions of a lossy (VP8) image', () => {
        expect(parseWebp(webpVp8(600, 600))).toEqual({ width: 600, height: 600 });
    });

    it('should read the dimensions of a lossless (VP8L) image', () => {
        expect(parseWebp(webpVp8l(1216, 684))).toEqual({ width: 1216, height: 684 });
    });

    it('should read the canvas size of an extended (VP8X) image', () => {
        expect(parseWebp(webpVp8x(1216, 684))).toEqual({ width: 1216, height: 684 });
    });

    it('should ignore the VP8 scale bits above the 14-bit size', () => {
        const bytes = webpVp8(600, 600);
        bytes[27] = (bytes[27] ?? 0) | 0x40;
        expect(parseWebp(bytes)).toEqual({ width: 600, height: 600 });
    });

    it('should reject a file without the RIFF / WEBP magic', () => {
        const fake = webpVp8(600, 600);
        fake.set(ascii('RIFX'), 0);
        expect(() => parseWebp(fake)).toThrow(WebpError);
        const png = webpVp8(600, 600);
        png.set(ascii('WAVE'), 8);
        expect(() => parseWebp(png)).toThrow(WebpError);
    });

    it('should reject a truncated file', () => {
        const full = webpVp8x(600, 600);
        expect(() => parseWebp(full.slice(0, 12))).toThrow(WebpError);
        expect(() => parseWebp(full.slice(0, full.length - 2))).toThrow(WebpError);
        expect(() => parseWebp(new Uint8Array())).toThrow(WebpError);
    });

    it('should reject an unknown chunk or a broken bitstream signature', () => {
        const unknown = webpVp8x(600, 600);
        unknown.set(ascii('ALPH'), 12);
        expect(() => parseWebp(unknown)).toThrow(/chunk/);
        const lossy = webpVp8(600, 600);
        lossy[23] = 0;
        expect(() => parseWebp(lossy)).toThrow(/start code/);
        const lossless = webpVp8l(600, 600);
        lossless[20] = 0;
        expect(() => parseWebp(lossless)).toThrow(/signature/);
    });
});
