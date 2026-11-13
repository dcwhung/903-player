import { ASSET_MAX_BYTES } from '@903-player/catalog';
import type { LoadedSource } from '../../ui/imageCrop';
import type { IconBoxes } from './iconModel';
import { renderIcons } from './iconRender';

const box = (x: number) => ({ x, y: 0, width: 100, height: 100 });
const BOXES: IconBoxes = { ios: box(1), android: box(2), tab: box(3) };
const LOADED = {
    file: new Blob(),
    image: { width: 400, height: 400, close: vi.fn() },
    source: { width: 400, height: 400 },
} as unknown as LoadedSource;

/** 假 canvas：記低畫咗乜（fillStyle + drawImage 參數），toBlob 出指定大細嘅 PNG */
const fakeEnv = (bytes = 10, type = 'image/png') => {
    const drawn: { size: number; fill: string | null; args: number[] }[] = [];
    const createCanvas = (width: number) => {
        const record = { size: width, fill: null as string | null, args: [] as number[] };
        drawn.push(record);
        const context = {
            set fillStyle(value: string) {
                record.fill = value;
            },
            fillRect: vi.fn(),
            drawImage: (_image: unknown, ...args: number[]) => (record.args = args),
        };
        return {
            width,
            height: width,
            getContext: () => context,
            toBlob: (done: (blob: Blob) => void) => done(new Blob(['x'.repeat(bytes)], { type })),
        } as unknown as HTMLCanvasElement;
    };
    return { env: { createCanvas }, drawn };
};

describe('renderIcons', () => {
    it("should draw each PNG from its own device's box, the maskable one inside the safe zone", async () => {
        const { env, drawn } = fakeEnv();
        const blobs = await renderIcons(LOADED, BOXES, '#f39200', env);
        expect(Object.keys(blobs)).toEqual([
            'favicon',
            'appleTouch',
            'icon192',
            'icon512',
            'maskable',
        ]);
        expect(drawn.map(({ size, args }) => [size, args[0]])).toEqual([
            [64, 3],
            [180, 1],
            [192, 2],
            [512, 2],
            [512, 2],
        ]);
        expect(drawn.map(({ fill }) => fill)).toEqual([null, null, null, null, '#f39200']);
        // maskable：圖畫喺中間 80%（51.2 → 460.8）
        const [x = 0, y = 0, width = 0, height = 0] = drawn[4]?.args.slice(4) ?? [];
        expect([x, y, width, height].map((n) => n.toFixed(1))).toEqual([
            '51.2',
            '51.2',
            '409.6',
            '409.6',
        ]);
        expect(drawn[3]?.args.slice(4)).toEqual([0, 0, 512, 512]);
    });

    it('should fail when the browser cannot make a PNG', async () => {
        const { env } = fakeEnv(10, 'image/jpeg');
        expect(await renderIcons(LOADED, BOXES, '#000000', env)).toEqual({
            error: '無法轉換為 PNG 圖片',
        });
    });

    it('should fail when a PNG is larger than the asset limit', async () => {
        const { env } = fakeEnv(ASSET_MAX_BYTES + 1);
        expect(await renderIcons(LOADED, BOXES, '#000000', env)).toHaveProperty('error');
    });
});
