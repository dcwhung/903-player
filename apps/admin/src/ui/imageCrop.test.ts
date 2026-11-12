import { ASSET_MAX_BYTES } from '@903-player/catalog';
import { CROP_MODE } from './cropGeometry';
import {
    centerCrop,
    cropBoxStyle,
    encodeWebp,
    loadSource,
    prepareImage,
    renderOutput,
    type ImageEnv,
} from './imageCrop';

const file = (type: string, name = 'photo.jpg', bytes: number[] = [1]) =>
    new File([new Uint8Array(bytes)], name, { type });

const PNG_12000 = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x2e,
    0xe0, 0, 0, 0x23, 0x28,
];

const fakeCanvas = (blobType: string, blobBytes = 1) => {
    const draws: unknown[][] = [];
    const fills: unknown[][] = [];
    const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
            drawImage: (...args: unknown[]) => draws.push(args),
            fillRect: (...args: unknown[]) => fills.push(args),
            fillStyle: '',
            getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
            imageSmoothingQuality: 'low',
        }),
        toBlob: (done: (blob: Blob | null) => void, type: string) =>
            done(new Blob([new Uint8Array(blobBytes)], { type: blobType || type })),
    };
    return { draws, fills, canvas };
};

const envOf = (size: { width: number; height: number }, blobType = 'image/webp', blobBytes = 1) => {
    const { canvas, draws, fills } = fakeCanvas(blobType, blobBytes);
    const close = vi.fn();
    const wasm = vi.fn(() => Promise.resolve(new Uint8Array([9]).buffer));
    const env: ImageEnv = {
        decode: vi.fn(() => Promise.resolve({ ...size, close })),
        createCanvas: (width, height) =>
            Object.assign(canvas, { width, height }) as unknown as HTMLCanvasElement,
        wasmEncode: wasm,
    };
    return { env, draws, fills, wasm, close };
};

const loaded = async (env: ImageEnv, type = 'image/jpeg') => {
    const result = await loadSource(file(type), env);
    if ('error' in result) throw new Error(result.error);
    return result;
};

describe('centerCrop', () => {
    it('should cut the sides of a wide photo for a square disc', () => {
        expect(centerCrop({ width: 1920, height: 1080 }, { width: 600, height: 600 })).toEqual({
            x: 420,
            y: 0,
            width: 1080,
            height: 1080,
        });
    });

    it('should cut top and bottom of a tall photo for a 16:9 banner', () => {
        expect(centerCrop({ width: 1000, height: 1000 }, { width: 1216, height: 684 })).toEqual({
            x: 0,
            y: 219,
            width: 1000,
            height: 563,
        });
    });

    it('should describe the crop box in percent for the preview', () => {
        const box = cropBoxStyle(
            { width: 1920, height: 1080 },
            { x: 420, y: 0, width: 1080, height: 1080 },
        );
        expect(box).toEqual({ left: '21.875%', top: '0%', width: '56.25%', height: '100%' });
    });
});

describe('loadSource', () => {
    it('should refuse other file types without decoding', async () => {
        const { env } = envOf({ width: 600, height: 600 });
        await expect(loadSource(file('image/gif', 'a.gif'), env)).resolves.toEqual({
            error: '只接受 PNG、JPG 或 WebP 圖片',
        });
        expect(env.decode).not.toHaveBeenCalled();
    });

    it('should refuse a file over 20 MB without decoding (S-816)', async () => {
        const { env } = envOf({ width: 600, height: 600 });
        const big = file('image/jpeg');
        Object.defineProperty(big, 'size', { value: 28.4 * 1024 * 1024 });
        await expect(loadSource(big, env)).resolves.toEqual({
            error: '檔案過大：28.4 MB，上限為 20 MB。',
        });
        expect(env.decode).not.toHaveBeenCalled();
    });

    it('should refuse an image over 8000 px from its header without decoding (S-816)', async () => {
        const { env } = envOf({ width: 600, height: 600 });
        await expect(loadSource(file('image/png', 'big.png', PNG_12000), env)).resolves.toEqual({
            error: '原圖尺寸過大：12000 × 9000，上限為 8000 × 8000 px，請先縮小後再選擇。',
        });
        expect(env.decode).not.toHaveBeenCalled();
    });

    it('should refuse an oversized image after decoding when the header is unreadable', async () => {
        const { env, close } = envOf({ width: 9000, height: 100 });
        await expect(loadSource(file('image/jpeg'), env)).resolves.toEqual({
            error: '原圖尺寸過大：9000 × 100，上限為 8000 × 8000 px，請先縮小後再選擇。',
        });
        expect(close).toHaveBeenCalled();
    });

    it('should report files the browser cannot decode', async () => {
        const { env } = envOf({ width: 600, height: 600 });
        env.decode = vi.fn(() => Promise.reject(new Error('bad')));
        await expect(loadSource(file('image/png'), env)).resolves.toEqual({
            error: '無法讀取此圖片',
        });
    });
});

describe('renderOutput', () => {
    it('should upload a WebP of the exact size untouched', async () => {
        const { env, draws } = envOf({ width: 600, height: 600 });
        const source = await loaded(env, 'image/webp');
        const box = { x: 0, y: 0, width: 600, height: 600 };
        const prepared = await renderOutput(source, { mode: CROP_MODE.CENTER, box }, 'disc', env);
        expect(prepared).toMatchObject({ blob: source.file, crop: null });
        expect(draws).toEqual([]);
    });

    it('should draw the dragged crop box scaled to the slot size', async () => {
        const { env, draws } = envOf({ width: 1920, height: 1080 });
        const box = { x: 100, y: 0, width: 1080, height: 1080 };
        const prepared = await renderOutput(
            await loaded(env),
            { mode: CROP_MODE.CENTER, box },
            'disc',
            env,
        );
        if ('error' in prepared) throw new Error(prepared.error);
        expect(prepared.blob.type).toBe('image/webp');
        expect(prepared.crop).toEqual(box);
        expect(draws[0]?.slice(1)).toEqual([100, 0, 1080, 1080, 0, 0, 600, 600]);
    });

    it('should show the whole image on a blurred background for 完整 · 模糊背景', async () => {
        const { env, draws, fills } = envOf({ width: 1920, height: 1080 });
        const box = { x: 0, y: 0, width: 1, height: 1 };
        const prepared = await renderOutput(
            await loaded(env),
            { mode: CROP_MODE.BLUR, box },
            'disc',
            env,
        );
        expect(prepared).toMatchObject({ crop: null });
        expect(fills).toHaveLength(1);
        expect(draws.at(-1)?.slice(1)).toEqual([0, 131.25, 600, 337.5]);
    });

    it('should stretch the outermost pixels for 完整 · 延伸邊緣', async () => {
        const { env, draws } = envOf({ width: 1920, height: 1080 });
        const box = { x: 0, y: 0, width: 1, height: 1 };
        await renderOutput(await loaded(env), { mode: CROP_MODE.EXTEND, box }, 'disc', env);
        // 上下各一條（寬圖放入正方形）+ 成張圖
        expect(draws).toHaveLength(3);
        expect(draws[0]?.slice(1, 5)).toEqual([0, 0, 1920, 1]);
    });

    it('should refuse an encoded image over ASSET_MAX_BYTES (S-805)', async () => {
        const { env } = envOf({ width: 1920, height: 1080 }, 'image/webp', ASSET_MAX_BYTES + 1);
        const box = { x: 0, y: 0, width: 1080, height: 1080 };
        const prepared = await renderOutput(
            await loaded(env),
            { mode: CROP_MODE.CENTER, box },
            'disc',
            env,
        );
        expect(prepared).toEqual({ error: '轉換後的圖片過大（1024 KB），上限為 1024 KB。' });
    });
});

describe('prepareImage', () => {
    it('should centre-crop, scale and encode as WebP in one go (R2 auto crop)', async () => {
        const { env, draws, close } = envOf({ width: 1920, height: 1080 });
        const prepared = await prepareImage(file('image/jpeg'), 'tile', env);
        if ('error' in prepared) throw new Error(prepared.error);
        expect(prepared.crop).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
        expect(draws[0]?.slice(5)).toEqual([0, 0, 1216, 684]);
        expect(close).toHaveBeenCalled();
    });
});

describe('encodeWebp', () => {
    it('should fall back to the wasm encoder when the browser makes PNG instead (Safari)', async () => {
        const { canvas } = fakeCanvas('image/png');
        const wasm = vi.fn(() => Promise.resolve(new Uint8Array([9]).buffer));
        const onWasm = vi.fn();
        const blob = await encodeWebp(canvas as unknown as HTMLCanvasElement, wasm, onWasm);
        expect(blob.type).toBe('image/webp');
        expect(wasm).toHaveBeenCalledOnce();
        expect(onWasm).toHaveBeenCalledOnce();
    });

    it('should use the browser encoder when it supports WebP', async () => {
        const { canvas } = fakeCanvas('image/webp');
        const wasm = vi.fn();
        expect((await encodeWebp(canvas as unknown as HTMLCanvasElement, wasm)).type).toBe(
            'image/webp',
        );
        expect(wasm).not.toHaveBeenCalled();
    });
});
