import { FAKE_IMAGE_SIZE, stubCanvas, stubImages } from '../../../tests/fakeBannerImage';
import {
    edgeGradient,
    loadBannerEdges,
    readBannerEdges,
    segmentAverages,
    type Rgb,
} from './bannerEdges';

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

const COLOR: Rgb = [10, 20, 30];
const SIDE_SEGMENTS = 16;
const TOP_SEGMENTS = 8;
const EDGE_ROWS = 8;

/** 只要 natural 大細嘅假圖（drawImage 係假嘅，唔使真圖） */
const fakeImage = (width = FAKE_IMAGE_SIZE, height = FAKE_IMAGE_SIZE): HTMLImageElement =>
    ({ naturalWidth: width, naturalHeight: height }) as HTMLImageElement;

/** 成張圖一隻色時預期嘅四邊 */
const solidEdges = (color: Rgb) => ({
    left: edgeGradient(Array<Rgb>(SIDE_SEGMENTS).fill(color), 'to bottom'),
    right: edgeGradient(Array<Rgb>(SIDE_SEGMENTS).fill(color), 'to bottom'),
    top: edgeGradient(Array<Rgb>(TOP_SEGMENTS).fill(color), 'to right'),
    bottom: edgeGradient([color], 'to right'),
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('readBannerEdges', () => {
    it('should read the four outer bands and turn them into gradients', () => {
        const getImageData = stubCanvas(COLOR);

        expect(readBannerEdges(fakeImage())).toEqual(solidEdges(COLOR));
        // 左欄、右欄（w - 1）、上面 8 行、下面 8 行（h - 8）
        const last = FAKE_IMAGE_SIZE - 1;
        const bottomY = FAKE_IMAGE_SIZE - EDGE_ROWS;
        expect(getImageData.mock.calls).toEqual([
            [0, 0, 1, FAKE_IMAGE_SIZE],
            [last, 0, 1, FAKE_IMAGE_SIZE],
            [0, 0, FAKE_IMAGE_SIZE, EDGE_ROWS],
            [0, bottomY, FAKE_IMAGE_SIZE, EDGE_ROWS],
        ]);
    });

    it('should return null when there is no 2D context (e.g. jsdom)', () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

        expect(readBannerEdges(fakeImage())).toBeNull();
    });

    it('should return null when the image has no size yet', () => {
        stubCanvas(COLOR);

        expect(readBannerEdges(fakeImage(0, 0))).toBeNull();
    });

    it('should return null when getImageData throws (e.g. tainted canvas SecurityError)', () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            drawImage: vi.fn(),
            getImageData: () => {
                throw new DOMException('tainted', 'SecurityError');
            },
        } as unknown as RenderingContext);

        expect(readBannerEdges(fakeImage())).toBeNull();
    });

    it('should return null when drawImage throws (e.g. decode failure)', () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            drawImage: () => {
                throw new DOMException('broken', 'InvalidStateError');
            },
        } as unknown as RenderingContext);

        expect(readBannerEdges(fakeImage())).toBeNull();
    });
});

describe('loadBannerEdges', () => {
    it('should load the image and read its edges', async () => {
        stubCanvas(COLOR);
        const images = stubImages();

        const pending = loadBannerEdges('/load-ok.png');
        images[0]?.onload?.();

        await expect(pending).resolves.toEqual(solidEdges(COLOR));
        expect(images[0]?.src).toBe('/load-ok.png');
    });

    it('should reuse the cached read for the same image', async () => {
        stubCanvas(COLOR);
        const images = stubImages();

        const first = loadBannerEdges('/load-cached.png');
        images[0]?.onload?.();
        await first;

        expect(loadBannerEdges('/load-cached.png')).toBe(first);
        expect(images).toHaveLength(1);
    });

    it('should resolve null when the image fails to load', async () => {
        const images = stubImages();

        const pending = loadBannerEdges('/load-error.png');
        images[0]?.onerror?.();

        await expect(pending).resolves.toBeNull();
    });

    it('should try again on the next load after a failed read', async () => {
        stubCanvas(COLOR);
        const images = stubImages();
        const failed = loadBannerEdges('/load-retry.png');
        images[0]?.onerror?.();
        await failed;

        // 例如離線第一次開未 precache：下次再載入要再試，唔好成個 session 都 cache 住 null
        const retry = loadBannerEdges('/load-retry.png');
        images[1]?.onload?.();

        expect(retry).not.toBe(failed);
        await expect(retry).resolves.toEqual(solidEdges(COLOR));
    });
});
