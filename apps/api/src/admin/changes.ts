/*
 * 變更摘要（packages/catalog summarizeChanges）：
 * - GET /api/changes：而家 D1（唔包 draft）vs 最新 ok publish → 時間線 + 驗證結果（admin 確認發佈頁一次 call）
 * - publishChanges：每次 publish 同佢之前最近一次 ok publish 比（GET /api/publishes 嘅 changes）；
 *   另加 bannerChanged（S-903）同 brandingChanged（App 外觀），淨換 banner / branding 嗰次 items 係空都分得出
 */
import {
    hkToday,
    summarizeChanges,
    type CatalogEntry,
    type ChangeDocument,
    type ChangeSummary,
} from '@903-player/catalog';
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { getBanner, type BannerImages } from '../banner/store';
import {
    brandingDocument,
    plainIconUrls,
    publishedBranding,
    sameBranding,
} from '../branding/document';
import { getBranding, type BrandingDraft } from '../branding/store';
import { CATALOG_IMAGE_PATH } from '../config';
import {
    documentFromEntries,
    PublishValidationError,
    validateDocument,
    type DocumentContext,
} from '../catalog/publish';
import type { PublishWarning } from '../catalog/warnings';
import {
    latestPublish,
    listAssetHashes,
    listEntries,
    type EntryRow,
    type PublishRow,
} from '../catalog/store';
import type { Json } from '../content/http';

export const changeRoutes = new Hono<AppEnv>();

const parseObject = (text: string): Json => {
    try {
        const value: unknown = JSON.parse(text);
        return typeof value === 'object' && value !== null && !Array.isArray(value)
            ? (value as Json)
            : {};
    } catch {
        return {};
    }
};

/**
 * 比較用 document：圖 URL 照 publish 嘅格式砌（同已發佈嗰份比先唔會次次當改咗圖），
 * 但唔驗圖（驗證另外做，唔合格都要比較得）
 */
export const previewDocument = (rows: readonly EntryRow[], origin: string): ChangeDocument => {
    const entriesOf = (kind: EntryRow['kind']): CatalogEntry[] =>
        rows
            .filter((row) => row.kind === kind)
            .map((row) => ({
                id: row.id,
                definition: parseObject(row.definition),
                images: Object.fromEntries(
                    Object.entries(parseObject(row.images)).map(([file, name]) => [
                        file,
                        `${origin}${CATALOG_IMAGE_PATH}${String(name)}`,
                    ]),
                ),
            }));
    return { shows: entriesOf('shows'), dramas: entriesOf('dramas') };
};

/** catalog.json 全文 → 比較用 document（壞咗當空） */
export const publishedDocument = (json: string): ChangeDocument => {
    const value = parseObject(json);
    const list = (key: string) => (Array.isArray(value[key]) ? (value[key] as CatalogEntry[]) : []);
    return { shows: list('shows'), dramas: list('dramas') };
};

type Validation = { ok: true; episodeCount: number } | { ok: false; error: string };

/** 驗證結果 + 警告（驗證唔過就冇警告） */
const validationOf = (
    rows: readonly EntryRow[],
    context: Omit<DocumentContext, 'generatedAt'>,
): { validation: Validation; warnings: PublishWarning[] } => {
    try {
        const generatedAt = new Date().toISOString();
        const { listedEpisodeIds, warnings } = validateDocument(
            documentFromEntries(rows, { ...context, generatedAt }),
        );
        return { validation: { ok: true, episodeCount: listedEpisodeIds.length }, warnings };
    } catch (error) {
        if (!(error instanceof PublishValidationError)) throw error;
        return { validation: { ok: false, error: error.message }, warnings: [] };
    }
};

/** 已發佈 catalog.json 嘅 banner（圖 URL；壞咗 / 冇當 null） */
const publishedBanner = (json: string): unknown => parseObject(json).banner ?? null;

/** 兩個 banner（圖 URL；null = 冇）一樣（S-946：GET /api/changes 同發佈記錄共用） */
const sameBanner = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

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

/** D1 branding 草稿照 publish 格式砌，同已發佈嗰份比（未 publish 過 = 有 branding 就係改咗） */
export const brandingChanged = (
    draft: BrandingDraft,
    latestDocument: string | undefined,
    origin: string,
): boolean =>
    !sameBranding(
        brandingDocument(draft, plainIconUrls(origin)).branding,
        publishedBranding(latestDocument),
    );

changeRoutes.get('/changes', async (c) => {
    const [rows, latest, assets, stored, branding] = await Promise.all([
        listEntries(c.env.DB),
        latestPublish(c.env.DB),
        listAssetHashes(c.env.DB),
        getBanner(c.env.DB),
        getBranding(c.env.DB),
    ]);
    const origin = c.env.WORKER_ORIGIN;
    const banner = stored && { standard: stored.standard, long: stored.long };
    const changes = summarizeChanges(
        latest ? publishedDocument(latest.document) : null,
        previewDocument(rows, origin),
        hkToday(),
    );
    const { validation, warnings } = validationOf(rows, { origin, assets, banner, branding });
    return c.json({
        base: latest?.row.id ?? null,
        changes,
        validation,
        warnings,
        bannerChanged: bannerChanged(banner, latest?.document, origin),
        brandingChanged: brandingChanged(branding, latest?.document, origin),
    });
});

/** 發佈記錄嘅變更摘要：summarizeChanges + banner / branding 有冇變（additive 欄位，S-903） */
export interface PublishChangeSummary extends ChangeSummary {
    bannerChanged: boolean;
    brandingChanged: boolean;
}

/** 兩份 catalog.json 嘅 banner 唔同（before 冇 = 第一次 publish：有 banner 就係改咗） */
const publishedBannerChanged = (before: string | undefined, after: string): boolean =>
    !sameBanner(before === undefined ? null : publishedBanner(before), publishedBanner(after));

/** 每行 publish 同佢之前最近一次 ok publish 比（rows 新到舊；documents = id → catalog.json） */
export const publishChanges = (
    rows: readonly PublishRow[],
    documents: ReadonlyMap<number, string>,
): Map<number, PublishChangeSummary> => {
    const summaries = new Map<number, PublishChangeSummary>();
    rows.forEach((row, i) => {
        const previous = rows.slice(i + 1).find((older) => older.status === 'ok');
        const before = previous ? documents.get(previous.id) : undefined;
        const after = documents.get(row.id) ?? '{}';
        const today = hkToday(new Date(row.created_at));
        const options = { rollbackOf: row.rollback_of };
        summaries.set(row.id, {
            ...summarizeChanges(
                before === undefined ? null : publishedDocument(before),
                publishedDocument(after),
                today,
                options,
            ),
            bannerChanged: publishedBannerChanged(before, after),
            brandingChanged: !sameBranding(publishedBranding(before), publishedBranding(after)),
        });
    });
    return summaries;
};
