// @vitest-environment node
/*
 * 抽色回歸參考（plan L2 #2）：用 player library 13 套人手配色嘅碟面跑抽色 → 九套候選，
 * 記錄最接近人手版嗰套嘅平均色差（10 色 RGB 距離平均）。只做參考：數字寫入 test annotation，
 * 唔 assert 色差（抽色算法一改數字就變，唔可以變 flaky gate）
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { THEME_COLOUR_KEYS } from '../../model/theme';
import { hexToRgb } from './colour';
import { buildPool, extractPalette } from './palette';

const LIBRARY = new URL('../../../../player/src/catalog/', import.meta.url);
const WASM = new URL(
    '../../../../../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm',
    import.meta.url,
);
const SAMPLE = 64;
const CHANNELS = 4;
type Theme = Record<(typeof THEME_COLOUR_KEYS)[number], string>;

interface Decoded {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

const libraryEntries = () =>
    (['dramas', 'shows'] as const).flatMap((kind) => {
        const dir = new URL(`${kind}/library/`, LIBRARY);
        const file = kind === 'dramas' ? 'drama.json' : 'show.json';
        return readdirSync(dir).map((id) => ({
            id,
            json: new URL(`${id}/${file}`, dir),
            disc: new URL(`${id}/disc.webp`, dir),
        }));
    });

/** 最近鄰縮到 64×64（browser 用 canvas drawImage，抽色結果相近） */
const sample = ({ data, width, height }: Decoded) => {
    const out = new Uint8ClampedArray(SAMPLE * SAMPLE * CHANNELS);
    for (let y = 0; y < SAMPLE; y += 1)
        for (let x = 0; x < SAMPLE; x += 1) {
            const from =
                (Math.floor((y * height) / SAMPLE) * width + Math.floor((x * width) / SAMPLE)) *
                CHANNELS;
            out.set(data.subarray(from, from + CHANNELS), (y * SAMPLE + x) * CHANNELS);
        }
    return out;
};

const themeDistance = (a: Theme, b: Theme) =>
    THEME_COLOUR_KEYS.reduce((sum, key) => {
        const [x, y] = [hexToRgb(a[key]), hexToRgb(b[key])];
        return sum + Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
    }, 0) / THEME_COLOUR_KEYS.length;

describe('palette regression (reference only)', () => {
    let decode: (buffer: ArrayBuffer) => Promise<Decoded>;

    beforeAll(async () => {
        // @jsquash/webp 回 ImageData：node 冇呢個 class，補一個最簡單嘅（tsconfig.node 冇 DOM / wasm 型別）
        const global = globalThis as unknown as Record<string, unknown> & {
            WebAssembly: { compile: (bytes: Uint8Array) => Promise<unknown> };
        };
        global.ImageData ??= class {
            constructor(
                readonly data: Uint8ClampedArray,
                readonly width: number,
                readonly height: number,
            ) {}
        };
        const webp = await import('@jsquash/webp/decode');
        const wasm = await global.WebAssembly.compile(readFileSync(fileURLToPath(WASM)));
        await (webp.init as unknown as (module: unknown) => Promise<void>)(wasm);
        decode = webp.default as unknown as typeof decode;
    });

    it('should build nine candidates for every hand-made library theme and record the closest', async ({
        annotate,
    }) => {
        const rows: string[] = [];
        for (const entry of libraryEntries()) {
            const theme = (JSON.parse(readFileSync(entry.json, 'utf8')) as { theme: Theme }).theme;
            const bytes = readFileSync(entry.disc);
            const image = await decode(
                bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
            );
            const pool = buildPool(extractPalette(sample(image)));
            expect(pool).toHaveLength(9);
            const best = pool
                .map((candidate) => ({
                    candidate,
                    distance: themeDistance(candidate.theme as Theme, theme),
                }))
                .sort((a, b) => a.distance - b.distance)[0];
            rows.push(`${entry.id}: ${best?.candidate.label} Δ${best?.distance.toFixed(1)}`);
        }
        expect(rows).toHaveLength(13);
        await annotate(rows.join('\n'));
    });
});
