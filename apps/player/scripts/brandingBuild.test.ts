import type { CatalogBranding, CatalogIcon, CatalogText } from '@903-player/catalog';
import { BRANDED_PUBLIC_DIR, PUBLIC_DIR, resolveBuildBranding } from './brandingBuild';

const TEXT: CatalogText = { name: '新城電台', description: '節目與音樂' };
const ICON = { version: 'v1' } as unknown as CatalogIcon;
const CATALOG_URL = 'https://api.example/catalog/v1/catalog.json';
const BRANDED_DIR = '/tmp/branded-public';

/** brandedDir：null = icon 下載失敗（brandedPublicDir 回 undefined） */
const run = (branding: CatalogBranding | undefined, brandedDir: string | null = BRANDED_DIR) => {
    const load = vi.fn(async () => branding);
    const brand = vi.fn(async () => brandedDir ?? undefined);
    const result = resolveBuildBranding({
        command: 'build',
        mode: 'production',
        catalogUrl: CATALOG_URL,
        load,
        brand,
    });
    return { load, brand, result };
};

describe('resolveBuildBranding', () => {
    it('should load branding with the build command, mode and catalog url', async () => {
        const { load, result } = run(undefined);
        await result;
        expect(load).toHaveBeenCalledWith({
            url: CATALOG_URL,
            command: 'build',
            mode: 'production',
        });
    });

    it('should keep the built-in text and public dir without branding', async () => {
        const { brand, result } = run(undefined);
        await expect(result).resolves.toEqual({ text: undefined, publicDir: undefined });
        expect(brand).not.toHaveBeenCalled();
    });

    it('should pass the text through and not touch icons for text-only branding', async () => {
        const { brand, result } = run({ text: TEXT });
        await expect(result).resolves.toEqual({ text: TEXT, publicDir: undefined });
        expect(brand).not.toHaveBeenCalled();
    });

    it('should build the branded public dir when there is an icon', async () => {
        const { brand, result } = run({ icon: ICON, text: TEXT });
        await expect(result).resolves.toEqual({ text: TEXT, publicDir: BRANDED_DIR });
        expect(brand).toHaveBeenCalledWith({
            icon: ICON,
            catalogUrl: CATALOG_URL,
            publicDir: PUBLIC_DIR,
            outDir: BRANDED_PUBLIC_DIR,
        });
    });

    it('should fall back to the built-in public dir when the icon download fails', async () => {
        const { result } = run({ icon: ICON }, null);
        await expect(result).resolves.toEqual({ text: undefined, publicDir: undefined });
    });

    it('should resolve the public dirs inside apps/player', () => {
        expect(PUBLIC_DIR).toMatch(/apps\/player\/public$/);
        expect(BRANDED_PUBLIC_DIR).toMatch(/apps\/player\/node_modules\/\.tmp\/branded-public$/);
    });
});
