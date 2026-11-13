/*
 * catalog.json 選填 branding（App 外觀 plan 2026-11-13）：App 圖示五張 PNG + 遮罩底色、App 名 / 短名 / 簡介。
 * player build 時讀（prebuild 下載 icon、vite 換 manifest / meta）；冇 = 用 repo 內建。
 * 規則同 schemas/catalog.schema.json 一致（catalogSchema.node.test.ts 鎖住）
 */
import { HEX_COLOUR_PATTERN } from '../core/hexColour';
import { fail, readImageUrl, readKnownKeys, type AssetRef } from './fields';

/** App 名（manifest name、<title>、og:title / og:site_name）最多幾多字 */
export const BRANDING_NAME_MAX_LENGTH = 40;
/** 短名（manifest short_name）最多幾多字；主畫面 > 12 字會被截（admin 只提示） */
export const BRANDING_SHORT_NAME_MAX_LENGTH = 24;
/** 簡介（meta description、og:description、manifest description）最多幾多字 */
export const BRANDING_DESCRIPTION_MAX_LENGTH = 200;

/** App 圖示：五張都要（ASSET_DIMENSIONS icon*，PNG）+ maskable 安全區外嘅底色 #rrggbb */
export interface CatalogIcon {
    favicon: AssetRef;
    appleTouch: AssetRef;
    icon192: AssetRef;
    icon512: AssetRef;
    maskable: AssetRef;
    maskableBackground: string;
}

/** App 名 + 簡介；shortName 冇 = 用 name */
export interface CatalogText {
    name: string;
    shortName?: string;
    description: string;
}

export interface CatalogBranding {
    icon?: CatalogIcon;
    text?: CatalogText;
}

export const ICON_IMAGE_KEYS = ['favicon', 'appleTouch', 'icon192', 'icon512', 'maskable'] as const;
export type IconImageKey = (typeof ICON_IMAGE_KEYS)[number];

const ICON_KEYS: readonly string[] = [...ICON_IMAGE_KEYS, 'maskableBackground'];
const TEXT_KEYS: readonly (keyof CatalogText)[] = ['name', 'shortName', 'description'];
const BRANDING_KEYS: readonly (keyof CatalogBranding)[] = ['icon', 'text'];

const lengthOf = (text: string): number => [...text].length;

/** trim 後唔可以空、長度（code point，同 JSON Schema maxLength 一樣）≤ max */
const readText = (value: unknown, path: string, max: number): string =>
    typeof value === 'string' && value.trim() !== '' && lengthOf(value) <= max
        ? value
        : fail(path, `must be 1–${max} characters (not blank)`);

const readIcon = (value: unknown, path: string): CatalogIcon => {
    const raw = readKnownKeys(value, path, ICON_KEYS);
    const images = Object.fromEntries(
        ICON_IMAGE_KEYS.map((key) => [key, readImageUrl(raw[key], `${path}.${key}`)]),
    ) as Record<IconImageKey, AssetRef>;
    const background = raw.maskableBackground;
    if (typeof background !== 'string' || !HEX_COLOUR_PATTERN.test(background))
        fail(`${path}.maskableBackground`, 'must be #rrggbb');
    return { ...images, maskableBackground: background as string };
};

const TEXT_PATH = 'branding.text';

/** 名稱與簡介（api PUT /api/branding/text 都用呢個驗） */
export const parseCatalogText = (value: unknown, path = TEXT_PATH): CatalogText => {
    const raw = readKnownKeys(value, path, TEXT_KEYS);
    const name = readText(raw.name, `${path}.name`, BRANDING_NAME_MAX_LENGTH);
    const description = readText(
        raw.description,
        `${path}.description`,
        BRANDING_DESCRIPTION_MAX_LENGTH,
    );
    if (raw.shortName === undefined) return { name, description };
    const shortName = readText(raw.shortName, `${path}.shortName`, BRANDING_SHORT_NAME_MAX_LENGTH);
    return { name, shortName, description };
};

/** branding：icon / text 各自選填；唔識嘅 key 拒絕（同 banner 一樣） */
export const readBranding = (value: unknown): CatalogBranding => {
    const raw = readKnownKeys(value, 'branding', BRANDING_KEYS);
    return {
        ...(raw.icon === undefined ? {} : { icon: readIcon(raw.icon, 'branding.icon') }),
        ...(raw.text === undefined ? {} : { text: parseCatalogText(raw.text) }),
    };
};
