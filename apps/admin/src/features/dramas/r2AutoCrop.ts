/*
 * R2 原圖自動裁切嘅計劃（純 function）：劇集 + 每個短篇嘅碟面 / 橫圖 slot，冇圖先做，有圖唔郁；
 * 碟面用 cd cover，冇就 cover photo；橫圖（tile）用 cover photo（用戶 2026-11-12，plan「R2 檔名」）。
 * sources 嘅短篇 id 對唔到 definition（新資料夾未掃描入）就略過
 */
import type { DramaSources, ImageMap, RawDefinition } from '../../api/types';
import { arcsOf, imageOf, str } from '../../model/raw';
import type { ImageSlotKind } from '../../ui/imageUpload';

export interface AutoCropJob {
    key: string;
    slot: ImageSlotKind;
    arcId?: string;
    sourceKey: string;
}

/** 圖片欄次序：橫圖先、碟面後（同 MediaAside） */
const SLOTS: readonly ImageSlotKind[] = ['tile', 'disc'];
const DRAMA_SLOTS: readonly ImageSlotKind[] = ['disc', 'tile'];

/** 一個 slot 嘅 key：'' + slot = 劇集；arcId + slot = 短篇 */
export const slotKey = (slot: ImageSlotKind, arcId?: string) => `${arcId ?? ''}:${slot}`;

/** R2 key → 檔名（「cd cover.jpg」） */
export const fileNameOf = (key: string) => key.split('/').at(-1) ?? key;

const hasImage = (target: RawDefinition, images: ImageMap, slot: ImageSlotKind) =>
    imageOf(target, images, slot) !== undefined;

const arcEntries = (definition: RawDefinition) =>
    arcsOf(definition).flatMap((arc) => {
        const id = str(arc, 'id');
        return id === undefined ? [] : [{ id, arc }];
    });

/** 冇圖嘅 slot（決定使唔使問 api sources） */
export const missingSlots = (definition: RawDefinition, images: ImageMap): string[] => [
    ...DRAMA_SLOTS.filter((slot) => !hasImage(definition, images, slot)).map((slot) =>
        slotKey(slot),
    ),
    ...arcEntries(definition).flatMap(({ id, arc }) =>
        SLOTS.filter((slot) => !hasImage(arc, images, slot)).map((slot) => slotKey(slot, id)),
    ),
];

interface Covers {
    cdCover: string | null;
    coverPhoto: string | null;
}

const sourceFor = (covers: Covers, slot: ImageSlotKind) =>
    slot === 'disc' ? (covers.cdCover ?? covers.coverPhoto) : covers.coverPhoto;

const jobsFor = (
    target: RawDefinition,
    images: ImageMap,
    covers: Covers,
    slots: readonly ImageSlotKind[],
    arcId?: string,
): AutoCropJob[] =>
    slots.flatMap((slot) => {
        const sourceKey = sourceFor(covers, slot);
        if (sourceKey === null || hasImage(target, images, slot)) return [];
        const job = { key: slotKey(slot, arcId), slot, sourceKey };
        return [arcId === undefined ? job : { ...job, arcId }];
    });

export const planAutoCrop = (
    definition: RawDefinition,
    images: ImageMap,
    sources: DramaSources,
): AutoCropJob[] => {
    const arcs = new Map(arcEntries(definition).map(({ id, arc }) => [id, arc]));
    return [
        ...jobsFor(definition, images, sources, DRAMA_SLOTS),
        ...sources.arcs.flatMap((covers) => {
            const arc = covers.id === null ? undefined : arcs.get(covers.id);
            return arc && covers.id ? jobsFor(arc, images, covers, SLOTS, covers.id) : [];
        }),
    ];
};
