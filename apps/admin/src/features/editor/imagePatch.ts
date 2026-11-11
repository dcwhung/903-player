/*
 * 圖片 slot → definition 入面嘅檔名：已有就沿用，冇就用 repo library 慣例
 *（劇集 / 節目 disc.webp、tile.webp；短篇 arcs/<id>/disc.webp）
 */
import type { RawDefinition } from '../../api/types';
import { isRecord, str } from '../../model/raw';
import type { ImageSlotKind } from '../../ui/imageUpload';

const defaultFile = (slot: ImageSlotKind, arcId?: string) =>
    arcId === undefined ? `${slot}.webp` : `arcs/${arcId}/${slot}.webp`;

const arcIndex = (definition: RawDefinition, arcId: string) =>
    Array.isArray(definition.arcs)
        ? definition.arcs.findIndex((arc) => isRecord(arc) && arc.id === arcId)
        : -1;

export const imageFileFor = (definition: RawDefinition, slot: ImageSlotKind, arcId?: string) => {
    if (arcId === undefined) return str(definition, slot) ?? defaultFile(slot);
    const arc = (definition.arcs as unknown[] | undefined)?.[arcIndex(definition, arcId)];
    return (isRecord(arc) && str(arc, slot)) || defaultFile(slot, arcId);
};

/** definition 指去呢個檔名（短篇就改嗰個 arc） */
export const withImageFile = (
    definition: RawDefinition,
    slot: ImageSlotKind,
    file: string,
    arcId?: string,
): RawDefinition => {
    if (arcId === undefined) return { ...definition, [slot]: file };
    const index = arcIndex(definition, arcId);
    if (index === -1) return definition;
    const arcs = [...(definition.arcs as RawDefinition[])];
    arcs[index] = { ...arcs[index], [slot]: file };
    return { ...definition, arcs };
};
