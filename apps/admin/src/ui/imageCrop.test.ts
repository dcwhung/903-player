import { centerCrop, cropBoxStyle, encodeWebp, prepareImage, type ImageEnv } from './imageCrop';

const file = (type: string, name = 'photo.jpg') => new File([new Uint8Array([1])], name, { type });

const fakeCanvas = (blobType: string) => {
    const draws: unknown[][] = [];
    return {
        draws,
        canvas: {
            width: 0,
            height: 0,
            getContext: () => ({
                drawImage: (...args: unknown[]) => draws.push(args),
                getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
                imageSmoothingQuality: 'low',
            }),
            toBlob: (done: (blob: Blob | null) => void, type: string) =>
                done(new Blob(['x'], { type: blobType || type })),
        },
    };
};

const envOf = (size: { width: number; height: number }, blobType = 'image/webp') => {
    const { canvas, draws } = fakeCanvas(blobType);
    const wasm = vi.fn(() => Promise.resolve(new Uint8Array([9]).buffer));
    const env: ImageEnv = {
        decode: vi.fn(() => Promise.resolve({ ...size, close: vi.fn() })),
        createCanvas: () => canvas as unknown as HTMLCanvasElement,
        wasmEncode: wasm,
    };
    return { env, draws, wasm };
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

    it('should keep an image that already has the right ratio whole', () => {
        expect(centerCrop({ width: 2432, height: 1368 }, { width: 1216, height: 684 })).toEqual({
            x: 0,
            y: 0,
            width: 2432,
            height: 1368,
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

describe('prepareImage', () => {
    it('should refuse other file types without decoding', async () => {
        const { env } = envOf({ width: 600, height: 600 });
        await expect(prepareImage(file('image/gif', 'a.gif'), 'disc', env)).resolves.toEqual({
            error: '只接受 PNG、JPG 或 WebP 圖片',
        });
        expect(env.decode).not.toHaveBeenCalled();
    });

    it('should report files the browser cannot decode', async () => {
        const { env } = envOf({ width: 600, height: 600 });
        env.decode = vi.fn(() => Promise.reject(new Error('bad')));
        await expect(prepareImage(file('image/png'), 'disc', env)).resolves.toEqual({
            error: '無法讀取此圖片',
        });
    });

    it('should upload a WebP of the exact size untouched', async () => {
        const { env, draws } = envOf({ width: 600, height: 600 });
        const webp = file('image/webp', 'disc.webp');
        const prepared = await prepareImage(webp, 'disc', env);
        expect(prepared).toMatchObject({
            blob: webp,
            crop: null,
            source: { width: 600, height: 600 },
        });
        expect(draws).toEqual([]);
    });

    it('should centre-crop, scale and encode other images as WebP', async () => {
        const { env, draws } = envOf({ width: 1920, height: 1080 });
        const prepared = await prepareImage(file('image/jpeg'), 'disc', env);
        if ('error' in prepared) throw new Error(prepared.error);
        expect(prepared.blob.type).toBe('image/webp');
        expect(prepared.crop).toEqual({ x: 420, y: 0, width: 1080, height: 1080 });
        expect(draws[0]?.slice(1)).toEqual([420, 0, 1080, 1080, 0, 0, 600, 600]);
    });
});

describe('encodeWebp', () => {
    it('should fall back to the wasm encoder when the browser makes PNG instead (Safari)', async () => {
        const { canvas } = fakeCanvas('image/png');
        const wasm = vi.fn(() => Promise.resolve(new Uint8Array([9]).buffer));
        const blob = await encodeWebp(canvas as unknown as HTMLCanvasElement, wasm);
        expect(blob.type).toBe('image/webp');
        expect(wasm).toHaveBeenCalledOnce();
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
