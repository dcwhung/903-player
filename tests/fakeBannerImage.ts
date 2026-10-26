import type { Rgb } from '../src/components/HomeLandscapeGrid/bannerEdges';

/** 假圖嘅 natural 大細（夠 16 段，每段都有 pixel） */
export const FAKE_IMAGE_SIZE = 32;
const OPAQUE = 255;

/** 一條帶全部係同一隻色嘅 ImageData */
const solidImageData = (width: number, height: number, [r, g, b]: Rgb): ImageData =>
    ({
        width,
        height,
        data: new Uint8ClampedArray(
            Array.from({ length: width * height }, () => [r, g, b, OPAQUE]).flat(),
        ),
    }) as ImageData;

/**
 * canvas 2D context 換做假嘅：drawImage noop，getImageData 返成條 color。
 * 返 getImageData spy 方便驗座標；用完要 vi.restoreAllMocks()
 */
export const stubCanvas = (color: Rgb) => {
    const getImageData = vi.fn((_x: number, _y: number, width: number, height: number) =>
        solidImageData(width, height, color),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: vi.fn(),
        getImageData,
    } as unknown as RenderingContext);
    return getImageData;
};

export interface FakeImage {
    naturalWidth: number;
    naturalHeight: number;
    src: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
}

/**
 * 全域 Image 換做假嘅（唔會真係載入），返每個 new 出嚟嘅 instance，
 * test 自己 call onload / onerror。用完要 vi.unstubAllGlobals()
 */
export const stubImages = (): FakeImage[] => {
    const images: FakeImage[] = [];
    vi.stubGlobal(
        'Image',
        class implements FakeImage {
            naturalWidth = FAKE_IMAGE_SIZE;
            naturalHeight = FAKE_IMAGE_SIZE;
            src = '';
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            constructor() {
                images.push(this);
            }
        },
    );
    return images;
};
