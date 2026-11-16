// @vitest-environment node
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ICON_IMAGE_KEYS, type CatalogIcon, type IconImageKey } from '@903-player/catalog';
import { BRANDING_ICON_FILES, brandedPublicDir } from './brandingIcons';

const CATALOG_URL = 'https://api.example/catalog/v1/catalog.json';
const IMG_BASE = 'https://api.example/catalog/v1/img/';
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const pngBytes = (seed: number) => new Uint8Array([...PNG_SIGNATURE, seed, seed + 1]);
const hashName = (bytes: Uint8Array) =>
    `${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.png`;

const BYTES = Object.fromEntries(
    ICON_IMAGE_KEYS.map((key, index) => [key, pngBytes(index * 2)]),
) as Record<IconImageKey, Uint8Array>;

/** favicon 用同 origin 路徑，其餘用絕對 URL（兩種都要識） */
const ICON: CatalogIcon = {
    favicon: `/catalog/v1/img/${hashName(BYTES.favicon)}`,
    appleTouch: `${IMG_BASE}${hashName(BYTES.appleTouch)}`,
    icon192: `${IMG_BASE}${hashName(BYTES.icon192)}`,
    icon512: `${IMG_BASE}${hashName(BYTES.icon512)}`,
    maskable: `${IMG_BASE}${hashName(BYTES.maskable)}`,
    maskableBackground: '#98bdde',
};

type Routes = Record<string, () => Response>;

const okRoutes = (): Routes =>
    Object.fromEntries(
        ICON_IMAGE_KEYS.map((key) => [
            new URL(ICON[key], CATALOG_URL).href,
            () => new Response(BYTES[key]),
        ]),
    );

const fakeFetch = (routes: Routes) =>
    vi.fn(async (input: string | URL | Request) => {
        const route = routes[String(input)];
        return route ? route() : new Response('not found', { status: 404 });
    });

let root: string;
let publicDir: string;
let outDir: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'branding-'));
    publicDir = join(root, 'public');
    outDir = join(root, 'out', 'public');
    await mkdir(join(publicDir, 'splash'), { recursive: true });
    await writeFile(join(publicDir, 'splash', 'mobile.webp'), 'splash');
    await writeFile(join(publicDir, BRANDING_ICON_FILES.favicon), 'built-in');
});

afterEach(() => rm(root, { recursive: true, force: true }));

const run = (fetchImpl: typeof fetch, icon: CatalogIcon = ICON) =>
    brandedPublicDir({ icon, catalogUrl: CATALOG_URL, publicDir, outDir, fetchImpl });

describe('brandedPublicDir', () => {
    it('should copy public and overwrite the five built-in icons with the catalog PNGs', async () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        await expect(run(fakeFetch(okRoutes()))).resolves.toBe(outDir);
        for (const key of ICON_IMAGE_KEYS) {
            const written = await readFile(join(outDir, BRANDING_ICON_FILES[key]));
            expect(new Uint8Array(written)).toEqual(BYTES[key]);
        }
        expect(await readFile(join(outDir, 'splash', 'mobile.webp'), 'utf8')).toBe('splash');
        // repo 嘅 public 唔可以郁
        expect(await readFile(join(publicDir, BRANDING_ICON_FILES.favicon), 'utf8')).toBe(
            'built-in',
        );
        log.mockRestore();
    });

    it('should name the output files after the public icons the manifest and index.html use', () => {
        expect(BRANDING_ICON_FILES).toEqual({
            favicon: 'favicon.png',
            appleTouch: 'apple-touch-icon.png',
            icon192: 'icon-192.png',
            icon512: 'icon-512.png',
            maskable: 'icon-maskable-512.png',
        });
    });

    describe('when an icon cannot be used, it falls back to all built-in icons', () => {
        let warn: ReturnType<typeof vi.spyOn>;
        beforeEach(() => {
            warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        });
        afterEach(() => warn.mockRestore());

        const expectFallback = async (fetchImpl: typeof fetch, icon?: CatalogIcon) => {
            await expect(run(fetchImpl, icon)).resolves.toBeUndefined();
            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]?.[0])).toContain('built-in icons');
            expect(existsSync(outDir)).toBe(false);
        };

        it('should fall back when one download fails', async () => {
            const routes = okRoutes();
            delete routes[ICON.icon512];
            await expectFallback(fakeFetch(routes));
        });

        it('should fall back when a file is not a PNG', async () => {
            const notPng = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
            const url = `${IMG_BASE}${hashName(notPng)}`;
            const routes = { ...okRoutes(), [url]: () => new Response(notPng) };
            await expectFallback(fakeFetch(routes), { ...ICON, maskable: url });
        });

        it('should fall back when the content does not match the hash file name', async () => {
            const routes = { ...okRoutes(), [ICON.icon192]: () => new Response(BYTES.icon512) };
            await expectFallback(fakeFetch(routes));
        });

        it('should fall back when the URL is not a <hash>.png file', async () => {
            const url = `${IMG_BASE}icon.png`;
            const routes = { ...okRoutes(), [url]: () => new Response(BYTES.icon192) };
            await expectFallback(fakeFetch(routes), { ...ICON, icon192: url });
        });

        it('should fall back when a download never answers', async () => {
            const hanging = vi.fn(() => new Promise<Response>(() => undefined));
            await expect(
                brandedPublicDir({
                    icon: ICON,
                    catalogUrl: CATALOG_URL,
                    publicDir,
                    outDir,
                    fetchImpl: hanging,
                    timeoutMs: 10,
                }),
            ).resolves.toBeUndefined();
            expect(String(warn.mock.calls[0]?.[1])).toMatch(/timed out/);
        });
    });
});
