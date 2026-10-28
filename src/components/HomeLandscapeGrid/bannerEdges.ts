export type Rgb = readonly [number, number, number];

/** 四邊補位用嘅 CSS background（左右沿高、上面沿闊漸變；下面一隻色） */
export interface BannerEdges {
    left: string;
    right: string;
    top: string;
    bottom: string;
}

interface Band {
    width: number;
    height: number;
    /** true = 沿闊分段（上下邊）；false = 沿高分段（左右邊） */
    horizontal: boolean;
    samples: number;
}

/** 左右邊：攞最外 1 欄，沿高分 16 段 */
const SIDE_PX = 1;
const SIDE_SAMPLES = 16;
/** 上下邊：攞最外 8 行；上面沿闊分 8 段，下面雲有藍色罅，成條平均一隻色免得變條紋 */
const TOP_BOTTOM_ROWS = 8;
const TOP_SAMPLES = 8;
const BOTTOM_SAMPLES = 1;
const BYTES_PER_PIXEL = 4;
const PERCENT = 100;
const HALF = 0.5;

interface ColorSum {
    r: number;
    g: number;
    b: number;
    count: number;
}

/** 一條邊（RGBA pixel）沿住條邊分 samples 段，每段逐粒 pixel 真平均（唔係縮圖抽樣） */
export const segmentAverages = (
    data: Uint8ClampedArray,
    { width, height, horizontal, samples }: Band,
): Rgb[] => {
    const along = horizontal ? width : height;
    const sums: ColorSum[] = Array.from({ length: samples }, () => ({
        r: 0,
        g: 0,
        b: 0,
        count: 0,
    }));
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const segment = Math.min(
                samples - 1,
                Math.floor(((horizontal ? x : y) * samples) / along),
            );
            const i = (y * width + x) * BYTES_PER_PIXEL;
            const sum = sums[segment] as ColorSum;
            sum.r += data[i] ?? 0;
            sum.g += data[i + 1] ?? 0;
            sum.b += data[i + 2] ?? 0;
            sum.count += 1;
        }
    }
    return sums.map(({ r, g, b, count }): Rgb => {
        const average = (total: number) => Math.round(total / count);
        return [average(r), average(g), average(b)];
    });
};

const rgb = ([r, g, b]: Rgb): string => `rgb(${r} ${g} ${b})`;

/**
 * 段色拉闊成 CSS 漸變：每隻色喺佢段嘅正中（同 canvas 將 N 格細圖平滑拉闊一樣，兩頭貼邊）。
 * 一段就成條一隻色
 */
export const edgeGradient = (colors: readonly Rgb[], direction: string): string => {
    if (colors.length === 1)
        return `linear-gradient(${direction}, ${rgb(colors[0] as Rgb)}, ${rgb(colors[0] as Rgb)})`;
    const stops = colors.map(
        (color, k) => `${rgb(color)} ${((k + HALF) / colors.length) * PERCENT}%`,
    );
    return `linear-gradient(${direction}, ${stops.join(', ')})`;
};

/** 由圖嘅 (x, y, width, height) 一條帶讀 pixel 再分段平均 */
const bandColors = (ctx: CanvasRenderingContext2D, x: number, y: number, band: Band): Rgb[] =>
    segmentAverages(ctx.getImageData(x, y, band.width, band.height).data, band);

/** 已畫咗圖嘅 canvas 讀四條邊 */
const edgesOf = (ctx: CanvasRenderingContext2D, width: number, height: number): BannerEdges => {
    const side: Band = { width: SIDE_PX, height, horizontal: false, samples: SIDE_SAMPLES };
    const edge = { width, height: TOP_BOTTOM_ROWS, horizontal: true };
    return {
        left: edgeGradient(bandColors(ctx, 0, 0, side), 'to bottom'),
        right: edgeGradient(bandColors(ctx, width - SIDE_PX, 0, side), 'to bottom'),
        top: edgeGradient(bandColors(ctx, 0, 0, { ...edge, samples: TOP_SAMPLES }), 'to right'),
        bottom: edgeGradient(
            bandColors(ctx, 0, height - TOP_BOTTOM_ROWS, { ...edge, samples: BOTTOM_SAMPLES }),
            'to right',
        ),
    };
};

/**
 * 用 canvas 讀橫額四邊嘅邊色；讀唔到（例如 jsdom 冇 context）就 null。
 * drawImage / getImageData 都可能 throw（跨源圖 taint 咗 canvas 會 SecurityError、decode 失敗），
 * 一樣當讀唔到：唔接住嘅話 onload 永遠唔 resolve，仲會變 uncaught error
 */
export const readBannerEdges = (img: HTMLImageElement): BannerEdges | null => {
    const { naturalWidth: width, naturalHeight: height } = img;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || width === 0 || height === 0) return null;
    try {
        ctx.drawImage(img, 0, 0);
        return edgesOf(ctx, width, height);
    } catch {
        return null;
    }
};

const cache = new Map<string, Promise<BannerEdges | null>>();

/**
 * 每張圖只讀一次（轉向、改大細、開關 mini player 都係重用）；載入 / 讀取失敗就 null。
 * 失敗唔 cache：例如離線第一次開未 precache，下次載入可以再試
 */
export const loadBannerEdges = (src: string): Promise<BannerEdges | null> => {
    const cached = cache.get(src);
    if (cached) return cached;
    const pending = new Promise<BannerEdges | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(readBannerEdges(img));
        img.onerror = () => resolve(null);
        img.src = src;
    }).then((edges) => {
        if (!edges) cache.delete(src);
        return edges;
    });
    cache.set(src, pending);
    return pending;
};
