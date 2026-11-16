/*
 * 還原未發佈改動（0.11.0，POST /api/entries/:kind/:id/revert 嘅純邏輯）：逐項將 D1 definition 嘅 key
 * 抄返最新 ok publish 嘅值（published 冇嗰個 key = 刪走 D1 嘅）。
 * - item 冇 arc = 頂層；有 arc = 嗰個短篇（arcIdOf：id，冇就用名）
 * - field 淨係認 own key（W-746：constructor / toString / __proto__ → 400）；tile / disc 兩邊冇 key 都認得
 *   （W-745：用慣例檔名）
 * - tile / disc：連 images 一齊還原（published 嗰邊 slot 指去嘅檔名，同 catalog editChanges 一樣冇寫就用慣例名）；
 *   還原之後冇 slot 再指去、之前有指去嘅 images key 刪走（還原前已經冇人用嘅 key 唔郁）。
 *   published 嗰個檔嘅 URL 解唔到（S-1009）→ D1 嗰個 key 唔郁（fail closed）
 * - 短篇 field '*' = 成個短篇換返 published 版本；D1 刪咗嘅短篇，任何 field 都會成個加返 published 嘅位置
 *   （published 前面最近、D1 仲有嘅短篇之後；冇就放第一）
 * - 錯誤：未知 field / 短篇（兩邊都冇）、頂層 'arcs' / '*' / 'order'（0.12.0：排序成個列表還原）、episodes / episodeDates（S-1008：新集數由發佈處理）→ 400；短篇喺 D1 有但從未發佈 → 409
 *   （reason 'arcNotPublished'，S-1011）
 */
import { arcImageFile, entryImageFile, IMAGE_SLOTS } from '@903-player/catalog';
import { isRecord, type Json } from './http';
import type { PublishedEntry, PublishedSource } from './publishedVersion';
import {
    arcList,
    copyKey,
    has,
    indexOfArc,
    insertionIndex,
    referencedFiles,
    slotOf,
} from './revertParts';

export interface RevertItem {
    arc?: string;
    field: string;
}

export const WHOLE_ARC = '*';
/** S-1008：新集數唔經還原（確認發佈頁嘅剔格處理），頂層（每日播）同短篇都 400 */
const EPISODE_FIELDS: ReadonlySet<string> = new Set(['episodes', 'episodeDates']);
/** 頂層唔准逐個還原：短篇要逐個 item（arc） */
const TOP_LEVEL_BLOCKED: ReadonlySet<string> = new Set(['arcs', WHOLE_ARC, ...EPISODE_FIELDS]);
/** #6：排序成個列表一齊還原（POST /api/order/:kind/revert），逐個 entry 還原會撞次序 → 400 */
const ORDER_FIELD = 'order';

/** 409 body.reason：短篇喺 D1 有、但最新 publish 冇（同 entry 嘅 notPublished 分開，S-1011） */
export const ARC_NOT_PUBLISHED = 'arcNotPublished';

export class RevertError extends Error {
    override readonly name = 'RevertError';
    constructor(
        readonly status: 400 | 409,
        message: string,
        readonly reason?: string,
    ) {
        super(message);
    }
}

/** 短篇 field：'*'、圖 slot（W-745）或者兩邊任何一邊嘅 own key（W-746）；新集數 → 400（S-1008） */
const checkArcField = (arcId: string, field: string, source: Json, target: unknown) => {
    if (EPISODE_FIELDS.has(field))
        throw new RevertError(400, `field ${field} cannot be reverted in arc ${arcId}`);
    const known =
        field === WHOLE_ARC ||
        slotOf(field) !== undefined ||
        has(source, field) ||
        (isRecord(target) && has(target, field));
    if (!known) throw new RevertError(400, `unknown field ${field} in arc ${arcId}`);
};

class Reverter {
    readonly definition: Json;
    readonly images: Json;
    private readonly published: PublishedEntry;
    private readonly unresolved: ReadonlySet<string>;
    /** 還原前 slot 指去嘅檔：之後冇人指就刪 */
    private readonly referencedBefore: Set<string>;

    constructor(current: PublishedEntry, source: PublishedSource) {
        this.definition = structuredClone(current.definition);
        this.images = structuredClone(current.images);
        this.published = source.entry;
        this.unresolved = source.unresolvedImages;
        this.referencedBefore = referencedFiles(this.definition);
    }

    apply(item: RevertItem) {
        if (item.arc === undefined) this.revertTop(item.field);
        else this.revertArc(item.arc, item.field);
    }

    /** 還原完：清走冇 slot 再指去嘅圖（解唔到嘅檔唔郁） */
    result(): PublishedEntry {
        const after = referencedFiles(this.definition);
        this.referencedBefore.forEach((file) => {
            if (!after.has(file) && !this.unresolved.has(file)) delete this.images[file];
        });
        return { definition: this.definition, images: this.images };
    }

    private restoreImage(file: string) {
        if (this.unresolved.has(file)) return;
        copyKey(this.images, this.published.images, file);
    }

    private revertTop(field: string) {
        const source = this.published.definition;
        if (field === ORDER_FIELD)
            throw new RevertError(400, 'order is reverted per list: POST /api/order/:kind/revert');
        const known =
            slotOf(field) !== undefined || has(source, field) || has(this.definition, field);
        if (TOP_LEVEL_BLOCKED.has(field) || !known)
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
            throw new RevertError(409, `arc ${arcId} has never been published`, ARC_NOT_PUBLISHED);
        }
        const target = arcs[index];
        checkArcField(arcId, field, source, target);
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

/** 逐項還原；唔得 → RevertError（400 / 409） */
export const applyRevert = (
    current: PublishedEntry,
    source: PublishedSource,
    items: readonly RevertItem[],
): PublishedEntry => {
    const reverter = new Reverter(current, source);
    items.forEach((item) => reverter.apply(item));
    return reverter.result();
};
