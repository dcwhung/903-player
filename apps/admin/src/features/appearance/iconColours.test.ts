import { BLACK, WHITE, edgeColours, swatchesOf } from './iconColours';

type Rgba = [number, number, number, number];

/** size × size 圖：邊緣按 edge(x, y) 填色，中間填 inner */
const image = (size: number, edge: (x: number, y: number) => Rgba, inner: Rgba) => {
    const data = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y += 1)
        for (let x = 0; x < size; x += 1) {
            const border = x === 0 || y === 0 || x === size - 1 || y === size - 1;
            data.set(border ? edge(x, y) : inner, (y * size + x) * 4);
        }
    return data;
};

const DARK: Rgba = [11, 11, 11, 255];
const ORANGE: Rgba = [243, 146, 0, 255];
const RED: Rgba = [255, 0, 0, 255];

describe('edgeColours', () => {
    it('should pick the two most common edge colours, ignoring the middle', () => {
        const data = image(8, (x) => (x < 5 ? DARK : ORANGE), RED);
        expect(edgeColours(data, 8)).toEqual(['#0b0b0b', '#f39200']);
    });

    it('should skip a second colour that is too close to the first', () => {
        const near: Rgba = [20, 20, 20, 255];
        const data = image(8, (x) => (x < 5 ? DARK : near), RED);
        expect(edgeColours(data, 8)).toEqual(['#0b0b0b']);
    });

    it('should ignore transparent edge pixels', () => {
        const clear: Rgba = [255, 255, 255, 0];
        expect(
            edgeColours(
                image(4, () => clear, RED),
                4,
            ),
        ).toEqual([]);
    });
});

describe('swatchesOf', () => {
    it('should offer the extracted colours then black and white without duplicates', () => {
        expect(swatchesOf(['#0b0b0b', '#f39200'])).toEqual(['#0b0b0b', '#f39200', BLACK, WHITE]);
        expect(swatchesOf([WHITE])).toEqual([WHITE, BLACK]);
        expect(swatchesOf([])).toEqual([BLACK, WHITE]);
    });
});
