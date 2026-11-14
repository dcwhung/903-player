/*
 * summarizeChanges 嘅「修改」item：
 * - 換圖：逐個 images 檔名比較，按前後兩份 definition 指去邊個檔名（冇寫就用慣例名）報 `tile` / `disc`
 *   或者 `arcs.<短篇>.tile`（共用一個檔就全部報）；新 / 落架短篇嘅檔唔報；對唔到任何欄位先報 `images`
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

interface FileOwners {
    /** 檔名 → 指去佢嘅欄位（共用一個檔就有幾個，W-743） */
    fields: Map<string, Set<string>>;
    /** 新短篇 / 落架 / 刪咗嘅短篇用嘅檔：有自己嘅 item，唔報 */
    ignored: Set<string>;
}

const addOwner = (owners: FileOwners, file: string, field: string) =>
    owners.fields.set(file, new Set([...(owners.fields.get(file) ?? []), field]));

const arcFile = (arc: RawJson, slot: string): string =>
    stringField(arc, slot) ?? conventionalFile(slot, stringField(arc, 'id') ?? arcIdOf(arc));

const listedArcIds = (definition: RawJson): Set<string> =>
    new Set(rawArcs(definition).filter(isArcListed).map(arcIdOf));

/** 前後兩份 definition 都計（W-744）：換咗指去嘅檔名，舊檔都認得返係邊個欄位 */
const fileOwners = (prev: RawJson, next: RawJson): FileOwners => {
    const owners: FileOwners = { fields: new Map(), ignored: new Set() };
    const tracked = new Set([...listedArcIds(prev)].filter((id) => listedArcIds(next).has(id)));
    for (const definition of [prev, next]) {
        IMAGE_SLOTS.forEach((slot) =>
            addOwner(owners, stringField(definition, slot) ?? conventionalFile(slot), slot),
        );
        rawArcs(definition).forEach((arc) => {
            const arcId = arcIdOf(arc);
            IMAGE_SLOTS.forEach((slot) => {
                const file = arcFile(arc, slot);
                if (tracked.has(arcId)) addOwner(owners, file, `arcs.${arcId}.${slot}`);
                else owners.ignored.add(file);
            });
        });
    }
    return owners;
};

const imageMap = (images: unknown): RawJson => (isRawRecord(images) ? images : {});

const fieldsOfFile = (owners: FileOwners, file: string): string[] => {
    const fields = owners.fields.get(file);
    if (fields) return [...fields];
    return owners.ignored.has(file) ? [] : [IMAGES_FIELD];
};

/** 圖改咗邊個欄位（冇改就空） */
export const imageEditFields = (prev: CatalogEntry, next: CatalogEntry): string[] => {
    if (sameJson(prev.images, next.images)) return [];
    const before = imageMap(prev.images);
    const after = imageMap(next.images);
    const owners = fileOwners(prev.definition, next.definition);
    const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
        (file) => !sameJson(before[file], after[file]),
    );
    return [...new Set(changed.flatMap((file) => fieldsOfFile(owners, file)))];
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
