/*
 * main.tsx 會喺 import 晒成個 app 之後、render 之前先 initCatalog。所以 import 任何 module 都唔可以讀 registry
 * （例如 module-level const = allShows().map(...)），否則今次 session 已經鎖死內建資料，remote catalog 用唔到
 * （dev throw / production 靜靜雞用返內建）。呢度 import main.tsx 會 import 嘅 module，再試 initCatalog
 */
import type { CatalogEntry } from '@903-player/catalog';

const remoteDocument = async () => {
    const { bundledSource: dramas } = await import('./dramas/lib/bundledSource');
    const { bundledSource: shows } = await import('./shows/lib/bundledSource');
    const entries = (folders: ReturnType<typeof dramas.folders>) =>
        folders.map(({ id, definition, images }) => ({
            id,
            definition: definition as CatalogEntry['definition'],
            images,
        }));
    return {
        schemaVersion: 1,
        generatedAt: '2026-11-07T10:00:00Z',
        shows: entries(shows.folders()),
        dramas: entries(dramas.folders()),
    };
};

describe('catalog registries and app module imports', () => {
    beforeEach(() => vi.resetModules());

    it('should not read any registry while the app modules are imported', async () => {
        await import('../App');
        await import('../player/AudioController');
        await import('../player/playbackLog');
        await import('../pwa/updateManager');
        await import('../services/storageMigration');
        const { initCatalog } = await import('./runtime');
        const body = JSON.stringify(await remoteDocument());
        const fetchImpl = vi.fn(() => Promise.resolve(new Response(body)));

        await expect(initCatalog({ url: '/catalog.json', fetchImpl })).resolves.toBe('remote');
    });
});
