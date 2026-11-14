/*
 * summarizeChanges 嘅「修改」item：
 * - 換圖：逐個 images 檔名比較，按 definition 指去邊個檔名（冇寫就用慣例名）報 `tile` / `disc`
 *   或者 `arcs.<短篇>.tile`；對唔到任何欄位先報 `images`
 * - 劇同短篇分開：劇本身一項 edit，每個短篇各自一項（arc ref，欄位唔帶 `arcs.` 前綴）
 */
import type { CatalogEntry } from '../document/document';
import type { ChangeEntryRef, ChangeItem } from './changeTypes';
import {
    arcIdOf,
    arcRefOf,
    isArcListed,
    isRawRecord,
    rawArcs,
    sameJson,
    stringField,
    type RawJson,
} from './rawDefinition';

const IMAGE_SLOTS = ['tile', 'disc'] as const;
const IMAGES_FIELD = 'images';
const ARC_FIELD = /^arcs\.(.+)\.([^.]+)$/;
const NOW = 'now';

/** admin 寫圖嘅慣例檔名（apps/admin imagePatch.ts defaultFile） */
const conventionalFile = (slot: string, arcId?: string): string =>
    arcId === undefined ? `${slot}.webp` : `arcs/${arcId}/${slot}.webp`;

/** 檔名 → 欄位；短篇只計前後都上架嘅（新短篇 / 落架有自己嘅 item），佢哋嘅檔名 → null（唔報） */
const fileOwners = (prev: RawJson, next: RawJson): Map<string, string | null> => {
    const owners = new Map<string, string | null>();
    IMAGE_SLOTS.forEach((slot) =>
        owners.set(stringField(next, slot) ?? conventionalFile(slot), slot),
    );
    const listedBefore = new Set(rawArcs(prev).filter(isArcListed).map(arcIdOf));
    rawArcs(next).forEach((arc) => {
        const arcId = arcIdOf(arc);
        const tracked = isArcListed(arc) && listedBefore.has(arcId);
        IMAGE_SLOTS.forEach((slot) => {
            const file =
                stringField(arc, slot) ?? conventionalFile(slot, stringField(arc, 'id') ?? arcId);
            if (!owners.has(file)) owners.set(file, tracked ? `arcs.${arcId}.${slot}` : null);
        });
    });
    return owners;
};

const imageMap = (images: unknown): RawJson => (isRawRecord(images) ? images : {});

/** 圖改咗邊個欄位（冇改就空） */
export const imageEditFields = (prev: CatalogEntry, next: CatalogEntry): string[] => {
    if (sameJson(prev.images, next.images)) return [];
    const before = imageMap(prev.images);
    const after = imageMap(next.images);
    const owners = fileOwners(prev.definition, next.definition);
    const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
        (file) => !sameJson(before[file], after[file]),
    );
    const fields = changed.flatMap((file) => {
        const owner = owners.get(file);
        if (owner === null) return [];
        return [owner ?? IMAGES_FIELD];
    });
    return [...new Set(fields)];
};

const arcOf = (definition: RawJson, arcId: string): RawJson | undefined =>
    rawArcs(definition).find((arc) => arcIdOf(arc) === arcId);

/** 欄位 list → 劇本身一項 + 每個短篇一項（跟欄位出現次序） */
export const editItemsFor = (
    ref: ChangeEntryRef,
    definition: RawJson,
    fields: readonly string[],
): ChangeItem[] => {
    const own: string[] = [];
    const byArc = new Map<string, { arc: RawJson; keys: string[] }>();
    for (const field of new Set(fields)) {
        const [, arcId = '', key = ''] = ARC_FIELD.exec(field) ?? [];
        const arc = key ? arcOf(definition, arcId) : undefined;
        if (arc) byArc.set(arcId, { arc, keys: [...(byArc.get(arcId)?.keys ?? []), key] });
        else own.push(field);
    }
    const entryItem: ChangeItem[] =
        own.length > 0 ? [{ kind: 'edit', when: NOW, entry: ref, detail: { fields: own } }] : [];
    const arcItems = [...byArc.values()].map(({ arc, keys }): ChangeItem => ({
        kind: 'edit',
        when: NOW,
        entry: ref,
        arc: arcRefOf(arc),
        detail: { fields: keys },
    }));
    return [...entryItem, ...arcItems];
};
