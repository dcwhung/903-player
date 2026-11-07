import { zoomInset } from './zoomInset';

const VIEWPORT = { width: 390, height: 844 };

describe('zoomInset', () => {
    it('should measure how far the tile sits from each viewport edge', () => {
        const rect = { top: 300, right: 190, bottom: 400, left: 20 };

        expect(zoomInset(rect, VIEWPORT)).toEqual({ top: 300, right: 200, bottom: 444, left: 20 });
    });

    it('should clamp the sides of a tile that sticks out of the viewport to the edge', () => {
        const rect = { top: -40, right: 420, bottom: 60, left: 300 };

        expect(zoomInset(rect, VIEWPORT)).toEqual({ top: 0, right: 0, bottom: 784, left: 300 });
    });

    it.each([
        ['above', { top: -120, right: 190, bottom: -20, left: 20 }],
        ['below', { top: 900, right: 190, bottom: 1000, left: 20 }],
        ['left of', { top: 300, right: -10, bottom: 400, left: -180 }],
        ['right of', { top: 300, right: 600, bottom: 400, left: 390 }],
    ])('should give nothing when the tile is wholly %s the viewport', (_, rect) => {
        expect(zoomInset(rect, VIEWPORT)).toBeNull();
    });

    it('should give nothing for a tile with no size (not laid out)', () => {
        expect(zoomInset({ top: 0, right: 0, bottom: 0, left: 0 }, VIEWPORT)).toBeNull();
    });
});
