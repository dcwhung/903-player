/*
 * 發佈記錄嘅變更摘要（GET /api/publishes 嘅 changes）：每次 publish 同佢之前最近一次 ok publish 比；
 * 另加 bannerChanged（S-903）同 brandingChanged（App 外觀），淨換 banner / branding 嗰次 items 係空都分得出
 */
import { hkToday, summarizeChanges, type ChangeSummary } from '@903-player/catalog';
import { publishedBranding, sameBranding } from '../branding/document';
import type { PublishRow } from '../catalog/store';
import { publishedBanner, publishedDocument, sameBanner } from './changeDocuments';

/** summarizeChanges + banner / branding 有冇變（additive 欄位，S-903） */
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
