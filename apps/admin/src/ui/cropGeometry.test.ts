import { fitRect, moveBox, resizeBox, upscaleFactor } from './cropGeometry';

const SOURCE = { width: 1920, height: 1080 };
const DISC = { width: 600, height: 600 };

describe('fitRect', () => {
    it('should letterbox a wide photo inside a square output (whole image shown)', () => {
        expect(fitRect(SOURCE, DISC)).toEqual({ x: 0, y: 131.25, width: 600, height: 337.5 });
    });

    it('should pillarbox a tall photo inside a 16:9 output', () => {
        expect(fitRect({ width: 1000, height: 1000 }, { width: 1216, height: 684 })).toEqual({
            x: 266,
            y: 0,
            width: 684,
            height: 684,
        });
    });
});

describe('moveBox', () => {
    const box = { x: 420, y: 0, width: 1080, height: 1080 };

    it('should move the crop box by the dragged amount', () => {
        expect(moveBox(box, { dx: -100, dy: 0 }, SOURCE)).toEqual({ ...box, x: 320 });
    });

    it('should keep the crop box inside the source image', () => {
        expect(moveBox(box, { dx: -999, dy: -50 }, SOURCE)).toEqual({ ...box, x: 0, y: 0 });
        expect(moveBox(box, { dx: 999, dy: 50 }, SOURCE)).toEqual({ ...box, x: 840, y: 0 });
    });
});

describe('resizeBox', () => {
    const box = { x: 420, y: 0, width: 1080, height: 1080 };

    it('should shrink the box from the bottom-right corner and keep the output ratio', () => {
        expect(resizeBox(box, { dx: -540, dy: 0 }, SOURCE, DISC)).toEqual({
            ...box,
            width: 540,
            height: 540,
        });
    });

    it('should not grow past the source image', () => {
        const small = { x: 1500, y: 600, width: 200, height: 200 };
        expect(resizeBox(small, { dx: 999, dy: 999 }, SOURCE, DISC)).toEqual({
            ...small,
            width: 420,
            height: 420,
        });
    });

    it('should not shrink below a fifth of the largest possible box', () => {
        expect(resizeBox(box, { dx: -2000, dy: -2000 }, SOURCE, DISC)).toEqual({
            ...box,
            width: 216,
            height: 216,
        });
    });
});

describe('upscaleFactor', () => {
    it('should report how much a smaller source has to be enlarged', () => {
        expect(upscaleFactor({ width: 480, height: 480 }, DISC)).toBe(1.25);
    });

    it('should be 1 when the source already covers the output', () => {
        expect(upscaleFactor(SOURCE, DISC)).toBe(1);
    });
});
