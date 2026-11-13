/*
 * 變更比較用嘅 document + App 外觀比較（GET /api/changes、發佈記錄共用）：
 * 圖 URL 照 publish 嘅格式砌，同已發佈嗰份比先唔會次次當改咗圖
 */
import type { CatalogEntry, ChangeDocument } from '@903-player/catalog';
import type { BannerImages } from '../banner/store';
import {
    brandingDocument,
    plainIconUrls,
    publishedBranding,
    sameBranding,
} from '../branding/document';
import type { BrandingDraft } from '../branding/store';
import type { Appearance } from '../catalog/selection';
import type { EntryRow } from '../catalog/store';
import { CATALOG_IMAGE_PATH } from '../config';
import { isRecord, parseJsonObject } from '../content/http';

/** 比較用 document：唔驗圖（驗證另外做，唔合格都要比較得） */
export const previewDocument = (rows: readonly EntryRow[], origin: string): ChangeDocument => {
    const entriesOf = (kind: EntryRow['kind']): CatalogEntry[] =>
        rows
            .filter((row) => row.kind === kind)
            .map((row) => ({
                id: row.id,
                definition: parseJsonObject(row.definition),
                images: Object.fromEntries(
                    Object.entries(parseJsonObject(row.images)).map(([file, name]) => [
                        file,
                        `${origin}${CATALOG_IMAGE_PATH}${String(name)}`,
                    ]),
                ),
            }));
    return { shows: entriesOf('shows'), dramas: entriesOf('dramas') };
};

/** catalog.json 全文 → 比較用 document（壞咗當空） */
export const publishedDocument = (json: string): ChangeDocument => {
    const value = parseJsonObject(json);
    const list = (key: string) => (Array.isArray(value[key]) ? (value[key] as CatalogEntry[]) : []);
    return { shows: list('shows'), dramas: list('dramas') };
};

/** 已發佈 catalog.json 嘅 banner（圖 URL；壞咗 / 冇當 null） */
export const publishedBanner = (json: string): unknown => parseJsonObject(json).banner ?? null;

/** 兩個 banner（圖 URL；null = 冇）一樣（S-946：GET /api/changes 同發佈記錄共用） */
export const sameBanner = (a: unknown, b: unknown): boolean =>
    JSON.stringify(a) === JSON.stringify(b);

/** D1 banner 照 publish 格式砌 URL，同已發佈嗰份比（未 publish 過 = 有 banner 就係改咗） */
export const bannerChanged = (
    banner: BannerImages | null,
    latestDocument: string | undefined,
    origin: string,
): boolean => {
    const draft =
        banner === null
            ? null
            : {
                  standard: `${origin}${CATALOG_IMAGE_PATH}${banner.standard}`,
                  long: `${origin}${CATALOG_IMAGE_PATH}${banner.long}`,
              };
    const published = latestDocument === undefined ? null : publishedBanner(latestDocument);
    return !sameBanner(draft, published);
};

const partOf = (branding: unknown, key: 'icon' | 'text'): unknown =>
    isRecord(branding) ? (branding[key] ?? null) : null;

/**
 * App 外觀三項各自同上次 ok publish 比（未 publish 過 = 有就係改咗）：
 * icon（五張圖 + 底色）、text（名稱與簡介）、banner
 */
export const appearanceChanges = (
    { branding, banner }: { branding: BrandingDraft; banner: BannerImages | null },
    latestDocument: string | undefined,
    origin: string,
): Appearance => {
    const draft = brandingDocument(branding, plainIconUrls(origin)).branding;
    const published = publishedBranding(latestDocument);
    const changed = (key: 'icon' | 'text') =>
        !sameBranding(partOf(draft, key), partOf(published, key));
    return {
        icon: changed('icon'),
        text: changed('text'),
        banner: bannerChanged(banner, latestDocument, origin),
    };
};
