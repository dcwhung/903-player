/* App 外觀（branding plan）：GET / PUT / DELETE /api/branding/{icon,text}、publish、changes、favicon */
import { env } from 'cloudflare:test';
import { parseCatalogDocument, type CatalogDocument } from '@903-player/catalog';
import { ORIGIN, adminGet, adminPost, adminRequest, call } from './helpers';
import { seed } from './fixtures';
import { pngOf } from './png';
import { webpVp8x } from './webp';

type Icon = Record<'favicon' | 'appleTouch' | 'icon192' | 'icon512' | 'maskable', string> & {
    maskableBackground: string;
};

interface BrandingBody {
    icon: Icon | null;
    text: { name: string; shortName?: string; description: string } | null;
    updatedAt: string | null;
}

const TEXT = { name: '903 Player', shortName: '903', description: '叱咤 903 節目重溫' };

const upload = async (body: Uint8Array, contentType = 'image/png'): Promise<string> => {
    const response = await adminRequest('PUT', '/api/assets', {
        body,
        headers: { 'content-type': contentType },
    });
    expect(response.status).toBeLessThan(300);
    return ((await response.json()) as { name: string }).name;
};

/** 五張真上載嘅 PNG（seed 唔同 → 每次 bytes 唔同） */
const uploadIcon = async (seedValue = 0): Promise<Icon> => ({
    favicon: await upload(pngOf(64, 64, seedValue)),
    appleTouch: await upload(pngOf(180, 180, seedValue)),
    icon192: await upload(pngOf(192, 192, seedValue)),
    icon512: await upload(pngOf(512, 512, seedValue)),
    maskable: await upload(pngOf(512, 512, seedValue + 1)),
    maskableBackground: '#1a2b3c',
});

const putIcon = (body: unknown) => adminRequest('PUT', '/api/branding/icon', { body });
const putText = (body: unknown) => adminRequest('PUT', '/api/branding/text', { body });
const getBranding = async (): Promise<BrandingBody> =>
    (await (await adminGet('/api/branding')).json()) as BrandingBody;
const errorOf = async (response: Response) => ((await response.json()) as { error: string }).error;

const publishedDocument = async (): Promise<CatalogDocument> => {
    const object = await env.CATALOG.get('catalog/v1/catalog.json');
    return parseCatalogDocument(JSON.parse((await object?.text()) ?? 'null'));
};

const imageUrl = (name: string) => `${ORIGIN}/catalog/v1/img/${name}`;

describe('GET /api/branding', () => {
    it('should answer nulls before anything is saved', async () => {
        expect(await getBranding()).toEqual({ icon: null, text: null, updatedAt: null });
    });

    it('should need a session', async () => {
        expect((await call('/api/branding')).status).toBe(401);
    });
});

describe('PUT /api/branding/icon', () => {
    it('should save the five PNG names + background and return them', async () => {
        const icon = await uploadIcon();
        const response = await putIcon(icon);
        expect(response.status).toBe(200);
        const body = (await response.json()) as BrandingBody;
        expect(body.icon).toEqual(icon);
        expect(body.text).toBeNull();
        expect(typeof body.updatedAt).toBe('string');
        expect(await getBranding()).toEqual(body);
    });

    it('should store the background in lower case', async () => {
        const icon = await uploadIcon();
        await putIcon({ ...icon, maskableBackground: '#ABCDEF' });
        expect((await getBranding()).icon?.maskableBackground).toBe('#abcdef');
    });

    it.each<[string, (icon: Icon) => unknown]>([
        [
            'a missing image',
            (icon) =>
                Object.fromEntries(Object.entries(icon).filter(([key]) => key !== 'maskable')),
        ],
        ['an image name that is not a string', (icon) => ({ ...icon, favicon: 1 })],
        ['a background that is not a string', (icon) => ({ ...icon, maskableBackground: 0 })],
        ['an unknown key', (icon) => ({ ...icon, splash: icon.icon512 })],
        ['a list', (icon) => [icon]],
    ])('should answer 400 for %s', async (_label, change) => {
        expect((await putIcon(change(await uploadIcon()))).status).toBe(400);
        expect((await getBranding()).icon).toBeNull();
    });

    it('should answer 422 for a background that is not #rrggbb', async () => {
        const response = await putIcon({ ...(await uploadIcon()), maskableBackground: '#abc' });
        expect(response.status).toBe(422);
        expect(await errorOf(response)).toMatch(/maskableBackground/);
    });

    it('should answer 422 for a WebP name, a missing upload and a wrong size', async () => {
        const icon = await uploadIcon();
        const webp = await upload(webpVp8x(600, 600), 'image/webp');
        const asWebp = await putIcon({ ...icon, favicon: webp });
        expect(await errorOf(asWebp)).toBe(`favicon: ${webp} is not <hash>.png`);
        const missing = await putIcon({ ...icon, icon192: '0000000000000000.png' });
        expect(await errorOf(missing)).toBe('icon192: 0000000000000000.png not uploaded');
        const swapped = await putIcon({ ...icon, favicon: icon.appleTouch });
        expect(swapped.status).toBe(422);
        expect(await errorOf(swapped)).toBe(
            `favicon: ${icon.appleTouch} is 180×180; must be 64×64`,
        );
        expect((await getBranding()).icon).toBeNull();
    });

    it('should refuse a cross-origin request', async () => {
        const response = await call('/api/branding/icon', {
            method: 'PUT',
            headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
            body: JSON.stringify(await uploadIcon()),
        });
        expect(response.status).toBe(403);
    });
});

describe('PUT /api/branding/text', () => {
    it('should trim and save the text, leaving out a blank shortName', async () => {
        const response = await putText({ name: '  903 Player ', shortName: ' ', description: 'x' });
        expect(response.status).toBe(200);
        expect(((await response.json()) as BrandingBody).text).toEqual({
            name: '903 Player',
            description: 'x',
        });
        await putText(TEXT);
        expect((await getBranding()).text).toEqual(TEXT);
    });

    it.each<[string, unknown]>([
        ['a name that is not a string', { ...TEXT, name: 903 }],
        ['no description', { name: TEXT.name }],
        ['a shortName that is not a string', { ...TEXT, shortName: 1 }],
        ['an unknown key', { ...TEXT, title: 'x' }],
        ['a string body', 'nope'],
    ])('should answer 400 for %s', async (_label, body) => {
        expect((await putText(body)).status).toBe(400);
        expect((await getBranding()).text).toBeNull();
    });

    it.each<[string, unknown]>([
        ['a blank name', { ...TEXT, name: '   ' }],
        ['a 41-character name', { ...TEXT, name: '字'.repeat(41) }],
        ['a 25-character shortName', { ...TEXT, shortName: 'a'.repeat(25) }],
        ['a 201-character description', { ...TEXT, description: 'a'.repeat(201) }],
    ])('should answer 422 for %s', async (_label, body) => {
        const response = await putText(body);
        expect(response.status).toBe(422);
        expect(await errorOf(response)).toMatch(/characters/);
    });
});

describe('DELETE /api/branding/icon and /text', () => {
    it('should restore the built-in icon / text separately and answer 204 every time', async () => {
        await putIcon(await uploadIcon());
        await putText(TEXT);
        expect((await adminRequest('DELETE', '/api/branding/icon')).status).toBe(204);
        expect((await getBranding()).icon).toBeNull();
        expect((await getBranding()).text).toEqual(TEXT);
        expect((await adminRequest('DELETE', '/api/branding/icon')).status).toBe(204);
        expect((await adminRequest('DELETE', '/api/branding/text')).status).toBe(204);
        expect(await getBranding()).toEqual({ icon: null, text: null, updatedAt: null });
    });
});

describe('POST /api/publish with branding', () => {
    beforeEach(() => seed(3));

    it('should leave branding out of catalog.json when none is saved', async () => {
        expect((await adminPost('/api/publish')).status).toBe(200);
        expect((await publishedDocument()).branding).toBeUndefined();
    });

    it('should write icon (worker image URLs) and text', async () => {
        const icon = await uploadIcon();
        await putIcon(icon);
        await putText(TEXT);
        expect((await adminPost('/api/publish')).status).toBe(200);
        expect((await publishedDocument()).branding).toEqual({
            icon: {
                favicon: imageUrl(icon.favicon),
                appleTouch: imageUrl(icon.appleTouch),
                icon192: imageUrl(icon.icon192),
                icon512: imageUrl(icon.icon512),
                maskable: imageUrl(icon.maskable),
                maskableBackground: icon.maskableBackground,
            },
            text: TEXT,
        });
    });

    it('should publish again when only the text changed, and drop branding after DELETE', async () => {
        await adminPost('/api/publish');
        await putText(TEXT);
        const changed = (await (await adminPost('/api/publish')).json()) as { unchanged?: true };
        expect(changed.unchanged).toBeUndefined();
        expect((await publishedDocument()).branding).toEqual({ text: TEXT });
        await adminRequest('DELETE', '/api/branding/text');
        await adminPost('/api/publish');
        expect((await publishedDocument()).branding).toBeUndefined();
    });

    it('should answer 422 when a saved icon image is no longer in assets', async () => {
        const icon = await uploadIcon();
        await putIcon(icon);
        await env.DB.prepare('DELETE FROM assets WHERE hash = ?')
            .bind(icon.maskable.split('.')[0])
            .run();
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(422);
        expect(await errorOf(response)).toMatch(/branding/);
    });
});

describe('brandingChanged', () => {
    beforeEach(() => seed(3));

    const changesFlag = async () =>
        ((await (await adminGet('/api/changes')).json()) as { brandingChanged: boolean })
            .brandingChanged;

    it('GET /api/changes should follow the saved branding against the latest publish', async () => {
        expect(await changesFlag()).toBe(false);
        await putText(TEXT);
        expect(await changesFlag()).toBe(true);
        await adminPost('/api/publish');
        expect(await changesFlag()).toBe(false);
        await putIcon(await uploadIcon());
        expect(await changesFlag()).toBe(true);
        await adminPost('/api/publish');
        await adminRequest('DELETE', '/api/branding/icon');
        expect(await changesFlag()).toBe(true);
    });

    it('GET /api/publishes should flag each publish that changed branding (newest first)', async () => {
        await adminPost('/api/publish');
        await putText(TEXT);
        await adminPost('/api/publish');
        await adminRequest('DELETE', '/api/branding/text');
        await adminPost('/api/publish');
        const rows = (
            (await (await adminGet('/api/publishes')).json()) as {
                publishes: { changes: { items: unknown[]; brandingChanged: boolean } }[];
            }
        ).publishes;
        expect(rows.map((row) => row.changes.brandingChanged)).toEqual([true, true, false]);
        expect(rows[0]?.changes.items).toEqual([]);
    });
});

describe('GET /api/branding/favicon', () => {
    beforeEach(() => seed(3));

    const favicon = () => call('/api/branding/favicon', { redirect: 'manual' });

    it('should redirect to the built-in /favicon.png without a session', async () => {
        const response = await favicon();
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/favicon.png');
    });

    it('should keep the built-in icon while the saved icon is only a draft', async () => {
        await putIcon(await uploadIcon());
        expect((await favicon()).headers.get('location')).toBe('/favicon.png');
    });

    it('should redirect to the published favicon PNG', async () => {
        const icon = await uploadIcon();
        await putIcon(icon);
        await adminPost('/api/publish');
        const response = await favicon();
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe(imageUrl(icon.favicon));
        expect(response.headers.get('cache-control')).toBe('no-cache');
    });
});
