/*
 * 選擇發佈：D1 document 套用 SelectionPlan。冇揀 / 未完成嘅新內容「完全唔入今次 catalog」，即係同上次發佈一樣：
 * 上次有（例如以下架狀態發佈過）就換返上次嗰個版本，冇就剔走。咁樣已發佈（鎖咗 ID）嘅內容唔會因為冇揀而消失，
 * ID 守衛照舊做最後防線。冇揀嘅 App 外觀（icon / text / banner）亦用上次 ok publish 嘅值（冇就冇）
 */
import type { CatalogEntry } from '@903-player/catalog';
import { isRecord, parseJsonObject, type Json } from '../content/http';
import { documentFromEntries, type DocumentContext } from './publish';
import type { Appearance, SelectionPlan } from './selection';
import type { EntryRow } from './store';

type Excluded = Pick<SelectionPlan, 'excludedDramas' | 'excludedArcs'>;

const arcsOf = (definition: Readonly<Json> | undefined): Json[] =>
    Array.isArray(definition?.arcs) ? (definition.arcs as unknown[]).filter(isRecord) : [];

/** 冇揀嘅短篇換返上次發佈嗰個（用 name 對：name = R2 子資料夾，永遠唔改；ID 可能改過），上次冇就剔走 */
const selectArcs = (
    entry: CatalogEntry,
    ids: ReadonlySet<string>,
    published: CatalogEntry | undefined,
): CatalogEntry => {
    if (!Array.isArray(entry.definition.arcs)) return entry;
    const before = new Map(arcsOf(published?.definition).map((arc) => [arc.name, arc]));
    const arcs = arcsOf(entry.definition).flatMap((arc) => {
        if (typeof arc.id !== 'string' || !ids.has(arc.id)) return [arc];
        const kept = before.get(arc.name);
        return kept ? [kept] : [];
    });
    return { ...entry, definition: { ...entry.definition, arcs } };
};

/** 劇集套用 selection（publish document 同變更預覽共用）；published = 上次 ok publish 嘅劇集 */
export const selectDramas = (
    dramas: readonly CatalogEntry[],
    excluded: Excluded,
    published: readonly CatalogEntry[],
): CatalogEntry[] => {
    const before = new Map(published.map((entry) => [entry.id, entry]));
    return dramas.flatMap((entry) => {
        const previous = before.get(entry.id);
        if (excluded.excludedDramas.has(entry.id)) return previous ? [previous] : [];
        const ids = excluded.excludedArcs.get(entry.id);
        return ids ? [selectArcs(entry, ids, previous)] : [entry];
    });
};

const entriesOf = (value: unknown): CatalogEntry[] =>
    Array.isArray(value) ? (value as CatalogEntry[]) : [];

/** branding 兩部分各自揀：冇揀嗰部分用上次發佈嘅（key 次序 icon → text，同 brandingDocument 一樣） */
const brandingOf = (now: unknown, before: unknown, { icon, text }: Appearance) => {
    const part = (value: unknown, key: string) => (isRecord(value) ? value[key] : undefined);
    const iconValue = icon ? part(now, 'icon') : part(before, 'icon');
    const textValue = text ? part(now, 'text') : part(before, 'text');
    if (iconValue === undefined && textValue === undefined) return {};
    return {
        branding: {
            ...(iconValue === undefined ? {} : { icon: iconValue }),
            ...(textValue === undefined ? {} : { text: textValue }),
        },
    };
};

/**
 * D1 → 今次 publish 嘅 document（未驗證）。冇揀嘅 branding / banner 唔砌（D1 草稿唔驗），
 * 再換返上次發佈嘅值；latestJson = 上次 ok publish 嘅 catalog.json（冇 = 第一次）
 */
export const selectedDocument = (
    rows: readonly EntryRow[],
    context: DocumentContext,
    plan: SelectionPlan,
    latestJson: string | undefined,
): unknown => {
    const { appearance } = plan;
    const { dramas, banner, branding, ...rest } = documentFromEntries(rows, {
        ...context,
        banner: appearance.banner ? context.banner : null,
        branding: {
            icon: appearance.icon ? context.branding.icon : null,
            text: appearance.text ? context.branding.text : null,
        },
    }) as Json;
    const previous = latestJson === undefined ? {} : parseJsonObject(latestJson);
    const keptBanner = appearance.banner ? banner : previous.banner;
    return {
        ...rest,
        dramas: selectDramas(entriesOf(dramas), plan, entriesOf(previous.dramas)),
        ...(keptBanner === undefined ? {} : { banner: keptBanner }),
        ...brandingOf(branding, previous.branding, appearance),
    };
};
