/*
 * 還原未發佈改動（0.11.0，POST /api/entries/:kind/:id/revert 嘅純邏輯）：逐項將 D1 definition 嘅 key
 * 抄返最新 ok publish 嘅值（published 冇嗰個 key = 刪走 D1 嘅）。
 * - item 冇 arc = 頂層；有 arc = 嗰個短篇（arcIdOf：id，冇就用名）
 * - tile / disc：連 images 一齊還原（published 嗰邊 slot 指去嘅檔名，同 catalog editChanges 一樣冇寫就用慣例名）；
 *   還原之後冇 slot 再指去、之前有指去嘅 images key 刪走（還原前已經冇人用嘅 key 唔郁）
 * - 短篇 field '*' = 成個短篇換返 published 版本；D1 刪咗嘅短篇，任何 field 都會成個加返 published 嘅位置
 *   （published 前面最近、D1 仲有嘅短篇之後；冇就放第一）
 * - 錯誤：未知 field / 短篇（兩邊都冇）、頂層 'arcs' / '*' → 400；短篇喺 D1 有但從未發佈 → 409
 */
import { arcIdOf, arcImageFile, entryImageFile, IMAGE_SLOTS } from '@903-player/catalog';
import { isRecord, type Json } from './http';
import type { PublishedEntry } from './published';

export interface RevertItem {
    arc?: string;
    field: string;
}

export const WHOLE_ARC = '*';
/** 頂層唔准逐個還原：短篇要逐個 item（arc） */
const TOP_LEVEL_BLOCKED = new Set(['arcs', WHOLE_ARC]);

export class RevertError extends Error {
    override readonly name = 'RevertError';
    constructor(
        readonly status: 400 | 409,
        message: string,
    ) {
        super(message);
    }
}

const slotOf = (field: string) => IMAGE_SLOTS.find((slot) => slot === field);

/** source 有就抄（深 copy），冇就刪 */
const copyKey = (target: Json, source: Json, key: string) => {
    if (key in source) target[key] = structuredClone(source[key]);
    else delete target[key];
};

const arcList = (definition: Json): unknown[] =>
    Array.isArray(definition.arcs) ? (definition.arcs as unknown[]) : [];

const indexOfArc = (arcs: readonly unknown[], arcId: string): number =>
    arcs.findIndex((arc) => isRecord(arc) && arcIdOf(arc) === arcId);

/** 已發佈嘅短篇加返 D1：放喺 published 前面最近、D1 仲有嘅短篇之後 */
const insertionIndex = (arcs: readonly unknown[], published: readonly unknown[], at: number) => {
    for (let i = at - 1; i >= 0; i -= 1) {
        const before = published[i];
        const found = isRecord(before) ? indexOfArc(arcs, arcIdOf(before)) : -1;
        if (found !== -1) return found + 1;
    }
    return 0;
};

class Reverter {
    readonly definition: Json;
    readonly images: Json;
    /** 還原前 slot 指去嘅檔：之後冇人指就刪 */
    private readonly referencedBefore: Set<string>;

    constructor(
        current: PublishedEntry,
        private readonly published: PublishedEntry,
    ) {
        this.definition = structuredClone(current.definition);
        this.images = structuredClone(current.images);
        this.referencedBefore = referencedFiles(this.definition);
    }

    apply(item: RevertItem) {
        if (item.arc === undefined) this.revertTop(item.field);
        else this.revertArc(item.arc, item.field);
    }

    /** 還原完：清走冇 slot 再指去嘅圖 */
    result(): PublishedEntry {
        const after = referencedFiles(this.definition);
        this.referencedBefore.forEach((file) => {
            if (!after.has(file)) delete this.images[file];
        });
        return { definition: this.definition, images: this.images };
    }

    private restoreImage(file: string) {
        copyKey(this.images, this.published.images, file);
    }

    private revertTop(field: string) {
        const source = this.published.definition;
        if (TOP_LEVEL_BLOCKED.has(field) || !(field in source || field in this.definition))
            throw new RevertError(400, `unknown field ${field}`);
        copyKey(this.definition, source, field);
        const slot = slotOf(field);
        if (slot) this.restoreImage(entryImageFile(source, slot));
    }

    private revertArc(arcId: string, field: string) {
        const publishedArcs = arcList(this.published.definition);
        const at = indexOfArc(publishedArcs, arcId);
        const source = publishedArcs[at];
        const arcs = arcList(this.definition);
        const index = indexOfArc(arcs, arcId);
        if (!isRecord(source)) {
            if (index === -1) throw new RevertError(400, `unknown arc ${arcId}`);
            throw new RevertError(409, `arc ${arcId} has never been published`);
        }
        const target = arcs[index];
        const known =
            field === WHOLE_ARC || field in source || (isRecord(target) && field in target);
        if (!known) throw new RevertError(400, `unknown field ${field} in arc ${arcId}`);
        if (!isRecord(target) || field === WHOLE_ARC) {
            const next = [...arcs];
            if (index === -1)
                next.splice(insertionIndex(arcs, publishedArcs, at), 0, structuredClone(source));
            else next[index] = structuredClone(source);
            this.definition.arcs = next;
            IMAGE_SLOTS.forEach((slot) => this.restoreImage(arcImageFile(source, slot)));
            return;
        }
        copyKey(target, source, field);
        const slot = slotOf(field);
        if (slot) this.restoreImage(arcImageFile(source, slot));
    }
}

/** definition（頂層 + 全部短篇）slot 指去嘅檔名 */
const referencedFiles = (definition: Json): Set<string> =>
    new Set(
        IMAGE_SLOTS.flatMap((slot) => [
            entryImageFile(definition, slot),
            ...arcList(definition).flatMap((arc) =>
                isRecord(arc) ? [arcImageFile(arc, slot)] : [],
            ),
        ]),
    );

/** 逐項還原；唔得 → RevertError（400 / 409） */
export const applyRevert = (
    current: PublishedEntry,
    published: PublishedEntry,
    items: readonly RevertItem[],
): PublishedEntry => {
    const reverter = new Reverter(current, published);
    items.forEach((item) => reverter.apply(item));
    return reverter.result();
};
