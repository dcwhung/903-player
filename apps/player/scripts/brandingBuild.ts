/*
 * Branding（App 外觀 plan 2026-11-13）：production build 讀 catalog.branding，畀 vite.config 用。
 * text → manifest name / short_name / description + index.html title / meta / og（injectBrandingText）；
 * icon → 下載五張 PNG 寫去 branded public 副本（gitignored），改 publicDir 覆蓋內建 icon。
 * loadBranding 自己 fetch catalog（唔靠 catalogSnapshot buildStart 寫嘅檔，嗰個喺 configResolved 之後先行）；
 * 失敗 / e2e / 冇 URL → 用內建值（text / publicDir 都係 undefined）。
 * S-965：由 vite.config.ts 抽出嚟（行為不變），令 config 檔 ≤ 150 行。
 */
import { resolve } from 'node:path';
import type { CatalogText } from '@903-player/catalog';
import { brandedPublicDir } from './brandingIcons.ts';
import { loadBranding } from './brandingConfig.ts';

export const PUBLIC_DIR = resolve(import.meta.dirname, '../public');
export const BRANDED_PUBLIC_DIR = resolve(
    import.meta.dirname,
    '../node_modules/.tmp/branded-public',
);

export interface BuildBrandingOptions {
    command: string;
    mode: string;
    /** catalog.json URL；空 = 功能關住 */
    catalogUrl: string;
    /** test 注入 */
    load?: typeof loadBranding;
    brand?: typeof brandedPublicDir;
}

export interface BuildBranding {
    /** undefined = 用 index.html / manifest 內建文字 */
    text?: CatalogText;
    /** undefined = 用內建 public folder */
    publicDir?: string;
}

export const resolveBuildBranding = async (
    options: BuildBrandingOptions,
): Promise<BuildBranding> => {
    const { command, mode, catalogUrl } = options;
    const branding = await (options.load ?? loadBranding)({ url: catalogUrl, command, mode });
    const publicDir = branding?.icon
        ? await (options.brand ?? brandedPublicDir)({
              icon: branding.icon,
              catalogUrl,
              publicDir: PUBLIC_DIR,
              outDir: BRANDED_PUBLIC_DIR,
          })
        : undefined;
    return { text: branding?.text, publicDir };
};
