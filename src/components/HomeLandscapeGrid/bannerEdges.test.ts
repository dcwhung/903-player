import { edgeGradient, segmentAverages, type Rgb } from './bannerEdges';

/** 由一堆 [r, g, b] 砌 RGBA pixel（alpha 255） */
const pixels = (colors: readonly Rgb[]): Uint8ClampedArray =>
    new Uint8ClampedArray(colors.flatMap((color) => [...color, 255]));

describe('segmentAverages', () => {
    it('should average every pixel of each segment down a column', () => {
        // 1 × 4 嘅一欄，分 2 段：上兩粒、下兩粒各自平均
        const data = pixels([
            [0, 0, 0],
            [100, 50, 10],
            [200, 200, 200],
            [100, 100, 100],
        ]);

        expect(
            segmentAverages(data, { width: 1, height: 4, horizontal: false, samples: 2 }),
        ).toEqual([
            [50, 25, 5],
            [150, 150, 150],
        ]);
    });

    it('should average whole columns of a band along its width', () => {
        // 4 × 2 嘅帶，分 2 段：每段 2 欄 × 2 行 = 4 粒一齊平均（唔係淨係抽一粒）
        const data = pixels([
            [0, 0, 0],
            [40, 0, 0],
            [10, 10, 10],
            [10, 10, 10],
            [80, 0, 0],
            [0, 0, 0],
            [30, 30, 30],
            [50, 50, 50],
        ]);

        expect(
            segmentAverages(data, { width: 4, height: 2, horizontal: true, samples: 2 }),
        ).toEqual([
            [30, 0, 0],
            [25, 25, 25],
        ]);
    });

    it('should round to whole colour values and allow a single segment', () => {
        const data = pixels([
            [0, 0, 1],
            [1, 2, 2],
            [1, 2, 2],
        ]);

        expect(
            segmentAverages(data, { width: 3, height: 1, horizontal: true, samples: 1 }),
        ).toEqual([[1, 1, 2]]);
    });
});

describe('edgeGradient', () => {
    it('should stretch the segments with each colour at the middle of its segment', () => {
        expect(
            edgeGradient(
                [
                    [0, 0, 0],
                    [255, 128, 0],
                ],
                'to bottom',
            ),
        ).toBe('linear-gradient(to bottom, rgb(0 0 0) 25%, rgb(255 128 0) 75%)');
    });

    it('should fill with one flat colour when there is only one segment', () => {
        expect(edgeGradient([[1, 2, 3]], 'to right')).toBe(
            'linear-gradient(to right, rgb(1 2 3), rgb(1 2 3))',
        );
    });
});
