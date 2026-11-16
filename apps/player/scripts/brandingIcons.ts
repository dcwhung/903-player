/*
 * Prebuild branding icons（App 外觀 plan 2026-11-13）：catalog 有 branding.icon 就下載五張 PNG，
 * 寫去一個 branded public 副本，覆蓋內建嘅 favicon / apple-touch / icon-192 / icon-512 / icon-maskable。
 * vite.config 喺 config 階段叫（manifest / publicDir 喺 configResolved 之前要定），成功就改 publicDir 去副本；
 * 任何一步失敗（下載唔到、唔係 PNG、hash 唔啱）→ console.warn + 用全套內建 icon，build 照行。
 */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
// type-only：vite.config / Node 直接 import catalog 嘅 value 會 extensionless 失敗（同 catalogSnapshot 一樣）
import type { CatalogIcon, IconImageKey } from '@903-player/catalog';
import { fetchBytes, matchesHashName, SNAPSHOT_FETCH_TIMEOUT_MS } from './snapshotFetch.ts';

/** IconImageKey → public 內建檔名（manifest / index.html 用嗰啲） */
export const BRANDING_ICON_FILES: Readonly<Record<IconImageKey, string>> = {
    favicon: 'favicon.png',
    appleTouch: 'apple-touch-icon.png',
    icon192: 'icon-192.png',
    icon512: 'icon-512.png',
    maskable: 'icon-maskable-512.png',
};

/** 本地 icon key 次序（唔 import catalog value）；satisfies + 下面 exhaustive check 鎖住同 catalog 一致 */
const ICON_KEYS = [
    'favicon',
    'appleTouch',
    'icon192',
    'icon512',
    'maskable',
] as const satisfies readonly IconImageKey[];
// catalog 加咗新 icon key 但呢度漏咗就 compile error（type-only，冇 runtime import）
type MissingKey = Exclude<IconImageKey, (typeof ICON_KEYS)[number]>;
const _exhaustive: MissingKey extends never ? true : never = true;
void _exhaustive;

const LOG_PREFIX = '[branding-icons]';
/** Worker PNG 檔名：<sha256 前 16 hex>.png */
const PNG_NAME_PATTERN = /^([0-9a-f]{16})\.png$/;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface BrandedPublicOptions {
    icon: CatalogIcon;
    /** catalog.json URL，補返同 origin 圖嘅 host */
    catalogUrl: string;
    /** 內建 public folder */
    publicDir: string;
    /** branded 副本寫去邊 */
    outDir: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}

const isPng = (bytes: Uint8Array) => PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);

/** 下載一張 icon PNG，驗 PNG magic + sha256 檔名；回傳要寫入嘅 bytes */
const fetchIcon = async (options: BrandedPublicOptions, key: IconImageKey): Promise<Uint8Array> => {
    const absolute = new URL(options.icon[key], options.catalogUrl).href;
    const name = absolute.slice(absolute.lastIndexOf('/') + 1);
    const hash = PNG_NAME_PATTERN.exec(name)?.[1];
    if (!hash) throw new Error(`branding.icon.${key} ${name} is not <hash>.png`);
    const fetchImpl = options.fetchImpl ?? fetch;
    const bytes = await fetchBytes(
        fetchImpl,
        absolute,
        options.timeoutMs ?? SNAPSHOT_FETCH_TIMEOUT_MS,
    );
    if (!isPng(bytes)) throw new Error(`branding.icon.${key} is not a PNG`);
    if (!matchesHashName(bytes, hash))
        throw new Error(`branding.icon.${key}: content hash does not match the file name`);
    return bytes;
};

/** 全部成功先整副本：rm → cp public → 覆蓋五張 icon */
const writeBrandedDir = async (options: BrandedPublicOptions, icons: readonly Uint8Array[]) => {
    await rm(options.outDir, { recursive: true, force: true });
    await mkdir(options.outDir, { recursive: true });
    await cp(options.publicDir, options.outDir, { recursive: true });
    await Promise.all(
        ICON_KEYS.map((key, index) =>
            writeFile(join(options.outDir, BRANDING_ICON_FILES[key]), icons[index] as Uint8Array),
        ),
    );
};

/**
 * 成功回傳 branded public folder 路徑（改 publicDir 去呢度）；失敗回傳 undefined（用內建）。
 * 先全部下載 + 驗完先寫，中途失敗唔會留半套 icon。
 */
export const brandedPublicDir = async (
    options: BrandedPublicOptions,
): Promise<string | undefined> => {
    try {
        const icons = await Promise.all(ICON_KEYS.map((key) => fetchIcon(options, key)));
        await writeBrandedDir(options, icons);
        console.log(`${LOG_PREFIX} applied ${icons.length} catalog icons`);
        return options.outDir;
    } catch (error) {
        await rm(options.outDir, { recursive: true, force: true });
        console.warn(`${LOG_PREFIX} falling back to the built-in icons`, error);
        return undefined;
    }
};
