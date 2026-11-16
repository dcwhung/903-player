/*
 * 還原未發佈改動（api 0.11.0）：已儲存版本 vs 最新發佈版本（GET entry published）邊啲欄位唔同。
 * 比較 JSON（catalog sameJson：唔理 key 次序，同變更摘要一樣，#5）；圖 slot（tile / disc）連埋 images 指去嘅圖一齊比（檔名冇寫就用慣例名，同 catalog editChanges）。
 * 頂層 = entry；有 arc = 嗰個短篇（catalog arcIdOf：id，冇就用名）。冇發佈版本 / 新短篇 → null（唔出還原）
 */
import { arcIdOf, arcImageFile, entryImageFile, IMAGE_SLOTS, sameJson } from '@903-player/catalog';
import type { ImageMap, LoadedEntry, RawDefinition } from '../../api/types';
import { arcsOf } from '../../model/raw';

/** 短篇 field '*' = 成個短篇（刪咗嘅短篇加返） */
export const WHOLE_ARC = '*';

/**
 * 頂層 `arcs` 要逐個短篇還原（api 400）；`images` 唔係 definition key；
 * `episodes` / `episodeDates` = 新集數，同確認發佈頁一樣唔出還原（由發佈剔格處理；api 400，S-1008）；
 * `order` = 成個列表一齊還原（確認發佈頁「節目排序已更改」，POST /api/order/:kind/revert；api 400，#6）
 */
const NOT_REVERTABLE: ReadonlySet<string> = new Set([
    'arcs',
    'images',
    'episodes',
    'episodeDates',
    'order',
]);

export type ImageSlot = (typeof IMAGE_SLOTS)[number];

export interface RevertSide {
    target: RawDefinition;
    images: ImageMap;
}

export interface RevertScope {
    /** 短篇 key；冇 = entry 頂層 */
    arc?: string;
    current: RevertSide;
    published: RevertSide;
}

export const isImageSlot = (field: string): field is ImageSlot =>
    (IMAGE_SLOTS as readonly string[]).includes(field);

export const arcByKey = (definition: RawDefinition, key: string): RawDefinition | undefined =>
    arcsOf(definition).find((arc) => arcIdOf(arc) === key);

/** entry 嘅還原範圍；arc = 短篇 key（兩邊都要有嗰個短篇） */
export const scopeOf = (
    entry: LoadedEntry | null | undefined,
    arc?: string,
): RevertScope | null => {
    const published = entry?.publishedVersion;
    if (!entry || !published) return null;
    if (arc === undefined)
        return {
            current: { target: entry.definition, images: entry.images },
            published: { target: published.definition, images: published.images },
        };
    const now = arcByKey(entry.definition, arc);
    const then = arcByKey(published.definition, arc);
    if (!now || !then) return null;
    return {
        arc,
        current: { target: now, images: entry.images },
        published: { target: then, images: published.images },
    };
};

/** slot 指去嘅圖（<hash>.<ext>）；冇 = undefined */
export const imageNameOf = (
    scope: RevertScope,
    side: RevertSide,
    slot: ImageSlot,
): string | undefined => {
    const file =
        scope.arc === undefined
            ? entryImageFile(side.target, slot)
            : arcImageFile(side.target, slot);
    return side.images[file];
};

export const fieldChanged = (scope: RevertScope | null, field: string): boolean => {
    if (!scope || NOT_REVERTABLE.has(field)) return false;
    const { current, published } = scope;
    if (!sameJson(current.target[field], published.target[field])) return true;
    return (
        isImageSlot(field) &&
        imageNameOf(scope, current, field) !== imageNameOf(scope, published, field)
    );
};

/** 改咗嘅欄位：兩邊 definition 嘅 key + 圖 slot */
export const changedFields = (scope: RevertScope | null): string[] => {
    if (!scope) return [];
    const keys = new Set([
        ...IMAGE_SLOTS,
        ...Object.keys(scope.current.target),
        ...Object.keys(scope.published.target),
    ]);
    return [...keys].filter((key) => fieldChanged(scope, key));
};
