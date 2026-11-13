/*
 * D1 branding 草稿 → catalog.json 嘅 branding（publish 同 GET /api/changes 共用，key 次序一致先比較得）：
 * icon 五張圖檔名 → 圖 URL（由 caller 決定點砌：publish 要驗已上載，changes 只砌 URL）+ 底色；text 原樣。
 * 兩部分都冇 = 唔寫 branding
 */
import { ICON_IMAGE_KEYS, type CatalogBranding, type IconImageKey } from '@903-player/catalog';
import { CATALOG_IMAGE_PATH } from '../config';
import type { BrandingDraft } from './store';

/** 圖檔名 → 圖 URL（同 key） */
export type IconUrls = (files: Record<IconImageKey, string>) => Record<string, string>;

/** 唔驗嘅版本（變更比較用）：照 publish 格式砌 Worker 圖 URL */
export const plainIconUrls =
    (origin: string): IconUrls =>
    (files) =>
        Object.fromEntries(
            Object.entries(files).map(([key, name]) => [
                key,
                `${origin}${CATALOG_IMAGE_PATH}${name}`,
            ]),
        );

const iconOf = (draft: BrandingDraft, urls: IconUrls) => {
    if (!draft.icon) return {};
    const files = Object.fromEntries(
        ICON_IMAGE_KEYS.map((key) => [key, draft.icon?.[key] ?? '']),
    ) as Record<IconImageKey, string>;
    return { icon: { ...urls(files), maskableBackground: draft.icon.maskableBackground } };
};

const textOf = ({ text }: BrandingDraft) =>
    text
        ? {
              text: {
                  name: text.name,
                  ...(text.shortName === undefined ? {} : { shortName: text.shortName }),
                  description: text.description,
              },
          }
        : {};

/** { branding } 或者 {}（spread 入 document） */
export const brandingDocument = (
    draft: BrandingDraft,
    urls: IconUrls,
): { branding?: CatalogBranding } =>
    draft.icon || draft.text
        ? { branding: { ...iconOf(draft, urls), ...textOf(draft) } as CatalogBranding }
        : {};

const parseObject = (json: string): Record<string, unknown> => {
    try {
        const value: unknown = JSON.parse(json);
        return typeof value === 'object' && value !== null
            ? (value as Record<string, unknown>)
            : {};
    } catch {
        return {};
    }
};

/** 一份 catalog.json 嘅 branding（冇 / 壞咗 = null） */
export const publishedBranding = (json: string | undefined): unknown =>
    json === undefined ? null : (parseObject(json).branding ?? null);

/** 兩份 branding（null = 冇）一樣：document 由同一個 builder 砌，key 次序穩定 */
export const sameBranding = (a: unknown, b: unknown): boolean =>
    JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
