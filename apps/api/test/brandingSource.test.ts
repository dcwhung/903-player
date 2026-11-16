/* App 圖示原圖 + 裁切框（icon recrop）：PUT /api/assets/source、PUT /api/branding/icon 嘅 source */
import { env } from 'cloudflare:test';
import { adminPost, adminRequest, adminGet } from './helpers';
import { seed } from './fixtures';
import { pngOf } from './png';
import { webpVp8x } from './webp';

type Box = { x: number; y: number; width: number; height: number };

interface Source {
    image: string;
    same: boolean;
    boxes: { ios: Box; android: Box; tab: Box };
}

type Icon = Record<'favicon' | 'appleTouch' | 'icon192' | 'icon512' | 'maskable', string> & {
    maskableBackground: string;
    source?: Source | null;
};

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0]);

const uploadSource = (body: Uint8Array, contentType: string) =>
    adminRequest('PUT', '/api/assets/source', { body, headers: { 'content-type': contentType } });

const nameOf = async (response: Response) => ((await response.json()) as { name: string }).name;

const upload = async (body: Uint8Array): Promise<string> =>
    nameOf(
        await adminRequest('PUT', '/api/assets', {
            body,
            headers: { 'content-type': 'image/png' },
        }),
    );

const uploadIcon = async (): Promise<Icon> => ({
    favicon: await upload(pngOf(64, 64)),
    appleTouch: await upload(pngOf(180, 180)),
    icon192: await upload(pngOf(192, 192)),
    icon512: await upload(pngOf(512, 512)),
    maskable: await upload(pngOf(512, 512, 1)),
    maskableBackground: '#1a2b3c',
});

const BOX: Box = { x: 10, y: 20, width: 900, height: 900 };
const IOS_BOX: Box = { x: 100, y: 100, width: 400.5, height: 400.5 };

const sourceOf = (image: string): Source => ({
    image,
    same: false,
    boxes: { ios: IOS_BOX, android: BOX, tab: BOX },
});

const putIcon = (body: unknown) => adminRequest('PUT', '/api/branding/icon', { body });
const iconNow = async () =>
    ((await (await adminGet('/api/branding')).json()) as { icon: Icon | null }).icon;
const errorOf = async (response: Response) => ((await response.json()) as { error: string }).error;

describe('PUT /api/assets/source', () => {
    it('should store a PNG / JPEG / WebP original of any size under its content hash', async () => {
        const png = await uploadSource(pngOf(1400, 1000), 'image/png');
        expect(png.status).toBe(201);
        const pngName = await nameOf(png);
        expect(pngName).toMatch(/^[0-9a-f]{16}\.png$/);
        expect(await env.CATALOG.head(`catalog/v1/img/${pngName}`)).not.toBeNull();
        expect(await nameOf(await uploadSource(JPEG_BYTES, 'image/jpeg'))).toMatch(/\.jpg$/);
        expect(await nameOf(await uploadSource(webpVp8x(3000, 2000), 'image/webp'))).toMatch(
            /\.webp$/,
        );
    });

    it('should answer 200 with the same name when the original is already stored', async () => {
        const first = await nameOf(await uploadSource(pngOf(700, 700), 'image/png'));
        const again = await uploadSource(pngOf(700, 700), 'image/png');
        expect(again.status).toBe(200);
        expect(await again.json()).toEqual({ name: first, existed: true });
    });

    it('should answer 415 for another type and 422 when the bytes are not that type', async () => {
        expect((await uploadSource(pngOf(10, 10), 'image/gif')).status).toBe(415);
        const wrong = await uploadSource(JPEG_BYTES, 'image/png');
        expect(wrong.status).toBe(422);
        expect(await errorOf(wrong)).toMatch(/PNG/);
    });

    it('should answer 413 for an original larger than 20 MB', async () => {
        const huge = new Uint8Array(20 * 1024 * 1024 + 1);
        huge.set(pngOf(10, 10));
        expect((await uploadSource(huge, 'image/png')).status).toBe(413);
    });
});

describe('PUT /api/branding/icon with source', () => {
    it('should keep an icon without source valid (no source key)', async () => {
        const icon = await uploadIcon();
        expect((await putIcon(icon)).status).toBe(200);
        expect(await iconNow()).toEqual(icon);
        expect((await putIcon({ ...icon, source: null })).status).toBe(200);
        expect(await iconNow()).toEqual(icon);
    });

    it('should save the original name + each device box + same, and return them', async () => {
        const image = await nameOf(await uploadSource(pngOf(1400, 1000), 'image/png'));
        const icon = { ...(await uploadIcon()), source: sourceOf(image) };
        const response = await putIcon(icon);
        expect(response.status).toBe(200);
        expect(await iconNow()).toEqual(icon);
    });

    it('should drop the source when the icon is saved again without one', async () => {
        const image = await nameOf(await uploadSource(pngOf(1400, 1000), 'image/png'));
        const icon = await uploadIcon();
        await putIcon({ ...icon, source: sourceOf(image) });
        await putIcon(icon);
        expect(await iconNow()).toEqual(icon);
    });

    it('should accept a stored icon PNG (512) as the original', async () => {
        const icon = await uploadIcon();
        expect((await putIcon({ ...icon, source: sourceOf(icon.icon512) })).status).toBe(200);
    });

    it.each<[string, (source: Source) => unknown]>([
        ['a source that is not an object', () => 'x.png'],
        ['a missing box', (source) => ({ ...source, boxes: { ios: BOX, android: BOX } })],
        ['an unknown device', (source) => ({ ...source, boxes: { ...source.boxes, tv: BOX } })],
        [
            'a box value that is not a number',
            (source) => ({ ...source, boxes: { ...source.boxes, ios: { ...BOX, x: '1' } } }),
        ],
        ['same that is not a boolean', (source) => ({ ...source, same: 'yes' })],
        ['an unknown source key', (source) => ({ ...source, background: '#000000' })],
    ])('should answer 400 for %s', async (_label, change) => {
        const icon = await uploadIcon();
        const source = sourceOf(icon.icon512);
        expect((await putIcon({ ...icon, source: change(source) })).status).toBe(400);
        expect(await iconNow()).toBeNull();
    });

    it.each<[string, Box]>([
        ['a negative position', { ...BOX, x: -1 }],
        ['an empty box', { ...BOX, width: 0 }],
        ['a box beyond 8000 px', { ...BOX, x: 7500, width: 600 }],
    ])('should answer 422 for %s', async (_label, box) => {
        const icon = await uploadIcon();
        const source = sourceOf(icon.icon512);
        const response = await putIcon({
            ...icon,
            source: { ...source, boxes: { ...source.boxes, android: box } },
        });
        expect(response.status).toBe(422);
        expect(await errorOf(response)).toMatch(/^source\.boxes\.android/);
        expect(await iconNow()).toBeNull();
    });

    it('should answer 422 when the original was never uploaded', async () => {
        const icon = await uploadIcon();
        const response = await putIcon({ ...icon, source: sourceOf('0000000000000000.png') });
        expect(response.status).toBe(422);
        expect(await errorOf(response)).toBe('source.image: 0000000000000000.png not uploaded');
        const traversal = await putIcon({ ...icon, source: sourceOf('../x.png') });
        expect(await errorOf(traversal)).toBe(
            'source.image: ../x.png is not <hash>.<png|jpg|webp>',
        );
    });

    it('should clear the source on DELETE and keep it out of catalog.json', async () => {
        await seed(3);
        const image = await nameOf(await uploadSource(pngOf(1400, 1000), 'image/png'));
        await putIcon({ ...(await uploadIcon()), source: sourceOf(image) });
        expect((await adminPost('/api/publish')).status).toBe(200);
        const published = await (await env.CATALOG.get('catalog/v1/catalog.json'))?.text();
        expect(published).not.toContain(image);
        expect(published).not.toContain('source');
        await adminRequest('DELETE', '/api/branding/icon');
        expect(await iconNow()).toBeNull();
    });
});
