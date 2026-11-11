import { parseWebp, WebpError } from '../src/assets/webp';
import {
    chunk,
    riffOf,
    vp8lPayload,
    vp8Payload,
    vp8xPayload,
    webpVp8,
    webpVp8l,
    webpVp8x,
} from './webp';

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

    // S-795：header 啱但冇圖像 / 唔係 keyframe 嘅檔都要擋（admin 會 decode，server 做輕量檢查）
    const header = chunk('VP8X', vp8xPayload(600, 600));
    const ALPHA = chunk('ALPH', [0, 0]);

    it('should reject a VP8X file without an image chunk (S-795)', () => {
        expect(() => parseWebp(riffOf([header]))).toThrow(/image/);
        expect(() => parseWebp(riffOf([header, chunk('EXIF', [0, 0])]))).toThrow(/image/);
        // ALPH 只係 VP8 嘅 alpha，單獨唔算圖
        expect(() => parseWebp(riffOf([header, ALPHA]))).toThrow(/image/);
    });

    it('should accept VP8X with ALPH + VP8, VP8L, or metadata around the image (S-795)', () => {
        const size = { width: 600, height: 600 };
        const lossy = chunk('VP8 ', vp8Payload(600, 600));
        expect(parseWebp(riffOf([header, ALPHA, lossy]))).toEqual(size);
        expect(parseWebp(riffOf([header, chunk('VP8L', vp8lPayload(600, 600))]))).toEqual(size);
        expect(parseWebp(riffOf([header, chunk('ICCP', [1, 2, 3]), lossy]))).toEqual(size);
    });

    it('should reject a VP8 frame that is not a keyframe (S-795)', () => {
        const interframe = chunk('VP8 ', vp8Payload(600, 600, 0x31));
        expect(() => parseWebp(riffOf([interframe]))).toThrow(/keyframe/);
        expect(() => parseWebp(riffOf([header, interframe]))).toThrow(/keyframe/);
    });

    it('should reject a broken image chunk inside VP8X (S-795)', () => {
        const broken = chunk('VP8L', vp8lPayload(600, 600));
        broken[8] = 0;
        expect(() => parseWebp(riffOf([header, broken]))).toThrow(/signature/);
        // 圖像 chunk 宣告嘅長度超出 RIFF
        const long = chunk('VP8 ', vp8Payload(600, 600));
        long[4] = 0xff;
        expect(() => parseWebp(riffOf([header, long]))).toThrow(WebpError);
    });
});
