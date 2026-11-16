/*
 * 選擇發佈嘅短篇圖（0.12.0，#1 #2）：selectArcs 換咗 / 拎走短篇之後，對返 entry 嘅 images。
 * - 拎走嘅短篇（包括被上次版本換走嘅 D1 版本）：佢 slot 指去嘅檔刪走；仲有其他 slot 指去就留
 * - 換返上次版本嘅短篇：佢 slot 指去嘅檔用上次發佈嘅值（上次冇 = 刪走）；同時有今次照發佈嘅 slot
 *   指去（例如共用劇集 tile）就用今次嘅值：其他已儲存嘅改動照發佈
 * 檔名解析同 catalog editChanges 一樣（slot 有寫用佢，冇寫用慣例名）；images 值係 document 嘅圖 URL
 * （documentFromEntries / previewDocument 都已經解咗），所以上次發佈嘅值可以直接抄
 */
import { arcImageFile, entryImageFile, IMAGE_SLOTS } from '@903-player/catalog';
import type { Json } from '../content/http';

const arcFiles = (arcs: readonly Json[]): Set<string> =>
    new Set(arcs.flatMap((arc) => IMAGE_SLOTS.map((slot) => arcImageFile(arc, slot))));

const entryFiles = (definition: Readonly<Json>): Set<string> =>
    new Set(IMAGE_SLOTS.map((slot) => entryImageFile(definition, slot)));

/** 檔名 → 圖 URL（CatalogEntry.images） */
type Images = Record<string, string>;

export interface ArcImageChange {
    /** 今次 document 嘅 definition（短篇已經揀好） */
    definition: Readonly<Json>;
    /** D1 有、今次 document 冇（拎走 / 被上次版本換走）嘅短篇 */
    dropped: readonly Json[];
    /** 換返上次發佈版本嘅短篇（上次嘅 definition） */
    restored: readonly Json[];
    /** 上次發佈嘅 images（冇 = 上次冇呢個 entry） */
    previous: Readonly<Images> | undefined;
}

/** D1 images（圖 URL）→ 今次 document 嘅 images */
export const selectImages = (
    images: Readonly<Images>,
    { definition, dropped, restored, previous }: ArcImageChange,
): Images => {
    const arcs = Array.isArray(definition.arcs) ? (definition.arcs as Json[]) : [];
    const restoredSet = new Set(restored);
    const referenced = new Set([...entryFiles(definition), ...arcFiles(arcs)]);
    const current = new Set([
        ...entryFiles(definition),
        ...arcFiles(arcs.filter((arc) => !restoredSet.has(arc))),
    ]);
    const result: Images = { ...images };
    arcFiles(dropped).forEach((file) => {
        if (!referenced.has(file)) delete result[file];
    });
    arcFiles(restored).forEach((file) => {
        if (current.has(file)) return;
        const value = previous?.[file];
        if (value === undefined) delete result[file];
        else result[file] = value;
    });
    return result;
};
