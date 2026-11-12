/* 首頁 banner（Phase 4）：GET / PUT / DELETE /api/banner + publish 寫入 catalog.json */
import { env } from 'cloudflare:test';
import { parseCatalogDocument, type CatalogDocument } from '@903-player/catalog';
import { ORIGIN, adminGet, adminPost, adminRequest, call } from './helpers';
import { seed } from './fixtures';
import { webpVp8, webpVp8x } from './webp';

interface BannerBody {
    banner: { standard: string; long: string } | null;
    updatedAt: string | null;
}

/** 經 PUT /api/assets 真上載（R2 + assets），回圖檔名 */
const uploadWebp = async (width: number, height: number, build = webpVp8x): Promise<string> => {
    const response = await adminRequest('PUT', '/api/assets', {
        body: build(width, height),
        headers: { 'content-type': 'image/webp' },
    });
    expect(response.status).toBe(201);
    return ((await response.json()) as { name: string }).name;
};

const uploadBanner = async () => ({
    standard: await uploadWebp(1200, 517),
    long: await uploadWebp(2000, 400),
});

const putBanner = (body: unknown) => adminRequest('PUT', '/api/banner', { body });

const getBanner = async (): Promise<BannerBody> =>
    (await (await adminGet('/api/banner')).json()) as BannerBody;

const publishedDocument = async (): Promise<CatalogDocument> => {
    const object = await env.CATALOG.get('catalog/v1/catalog.json');
    return parseCatalogDocument(JSON.parse((await object?.text()) ?? 'null'));
};

describe('GET /api/banner', () => {
    it('should answer null before any banner is saved', async () => {
        const response = await adminGet('/api/banner');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ banner: null, updatedAt: null });
    });

    it('should need a session', async () => {
        expect((await call('/api/banner')).status).toBe(401);
    });
});

describe('PUT /api/banner', () => {
    it('should save both images and return them', async () => {
        const banner = await uploadBanner();
        const response = await putBanner(banner);
        expect(response.status).toBe(200);
        const body = (await response.json()) as BannerBody;
        expect(body.banner).toEqual(banner);
        expect(typeof body.updatedAt).toBe('string');
        expect(await getBanner()).toEqual(body);
    });

    it('should replace an earlier banner', async () => {
        await putBanner(await uploadBanner());
        // 同一張圖 hash 一樣：換一張唔同 bytes 嘅（VP8 而唔係 VP8X）
        const next = {
            standard: await uploadWebp(1200, 517, webpVp8),
            long: await uploadWebp(2000, 400, webpVp8),
        };
        expect((await putBanner(next)).status).toBe(200);
        expect((await getBanner()).banner).toEqual(next);
    });

    it('should answer 400 unless both standard and long are strings', async () => {
        const { standard } = await uploadBanner();
        expect((await putBanner({ standard })).status).toBe(400);
        expect((await putBanner({ standard, long: 1 })).status).toBe(400);
        expect((await putBanner('nope')).status).toBe(400);
        expect((await getBanner()).banner).toBeNull();
    });

    it('should answer 422 for a name that is not <hash>.webp', async () => {
        const { standard } = await uploadBanner();
        const response = await putBanner({ standard, long: '../catalog.json' });
        expect(response.status).toBe(422);
        expect((await getBanner()).banner).toBeNull();
    });

    it('should answer 422 for an image that was never uploaded', async () => {
        const { standard } = await uploadBanner();
        const response = await putBanner({ standard, long: '0000000000000000.webp' });
        expect(response.status).toBe(422);
        expect(((await response.json()) as { error: string }).error).toMatch(/not uploaded/);
    });

    it('should answer 422 when a slot has the wrong size (swapped or a disc)', async () => {
        const banner = await uploadBanner();
        const swapped = await putBanner({ standard: banner.long, long: banner.standard });
        expect(swapped.status).toBe(422);
        expect(((await swapped.json()) as { error: string }).error).toMatch(/1200×517/);
        const disc = await uploadWebp(600, 600);
        expect((await putBanner({ standard: banner.standard, long: disc })).status).toBe(422);
        expect((await getBanner()).banner).toBeNull();
    });

    it('should refuse a cross-origin request', async () => {
        const response = await call('/api/banner', {
            method: 'PUT',
            headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
            body: JSON.stringify(await uploadBanner()),
        });
        expect(response.status).toBe(403);
    });
});

describe('DELETE /api/banner', () => {
    it('should remove the banner (restore the default) and answer 204 every time', async () => {
        await putBanner(await uploadBanner());
        expect((await adminRequest('DELETE', '/api/banner')).status).toBe(204);
        expect(await getBanner()).toEqual({ banner: null, updatedAt: null });
        expect((await adminRequest('DELETE', '/api/banner')).status).toBe(204);
    });
});

describe('POST /api/publish with a banner', () => {
    beforeEach(() => seed(3));

    it('should leave banner out of catalog.json when none is saved', async () => {
        expect((await adminPost('/api/publish')).status).toBe(200);
        expect((await publishedDocument()).banner).toBeUndefined();
    });

    it('should write the banner as worker image URLs', async () => {
        const banner = await uploadBanner();
        await putBanner(banner);
        expect((await adminPost('/api/publish')).status).toBe(200);
        expect((await publishedDocument()).banner).toEqual({
            standard: `${ORIGIN}/catalog/v1/img/${banner.standard}`,
            long: `${ORIGIN}/catalog/v1/img/${banner.long}`,
        });
    });

    it('should publish again when only the banner changed, and drop it after DELETE', async () => {
        expect((await adminPost('/api/publish')).status).toBe(200);
        await putBanner(await uploadBanner());
        const withBanner = (await (await adminPost('/api/publish')).json()) as Record<
            string,
            unknown
        >;
        expect(withBanner.unchanged).toBeUndefined();
        await adminRequest('DELETE', '/api/banner');
        const restored = (await (await adminPost('/api/publish')).json()) as Record<
            string,
            unknown
        >;
        expect(restored.unchanged).toBeUndefined();
        expect((await publishedDocument()).banner).toBeUndefined();
    });

    it('should keep the saved banner through a rollback (rollback only restores listings)', async () => {
        await adminPost('/api/publish');
        const banner = await uploadBanner();
        await putBanner(banner);
        await adminPost('/api/publish');
        const response = await adminPost('/api/publishes/1/rollback');
        expect(response.status).toBe(200);
        expect((await publishedDocument()).banner?.standard).toBe(
            `${ORIGIN}/catalog/v1/img/${banner.standard}`,
        );
    });

    it('should answer 422 when a saved banner image is no longer in assets', async () => {
        const banner = await uploadBanner();
        await putBanner(banner);
        await env.DB.prepare('DELETE FROM assets WHERE hash = ?')
            .bind(banner.long.split('.')[0])
            .run();
        const response = await adminPost('/api/publish');
        expect(response.status).toBe(422);
        expect(((await response.json()) as { error: string }).error).toMatch(/banner/);
    });
});

describe('GET /api/changes bannerChanged', () => {
    beforeEach(() => seed(3));

    const bannerChanged = async () =>
        ((await (await adminGet('/api/changes')).json()) as { bannerChanged: boolean })
            .bannerChanged;

    it('should follow the saved banner against the latest publish', async () => {
        expect(await bannerChanged()).toBe(false);
        await putBanner(await uploadBanner());
        expect(await bannerChanged()).toBe(true);
        await adminPost('/api/publish');
        expect(await bannerChanged()).toBe(false);
        await adminRequest('DELETE', '/api/banner');
        expect(await bannerChanged()).toBe(true);
    });
});
