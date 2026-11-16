/*
 * revert.ts 用嘅細件：own key 判斷（W-746）、抄 key、短篇搵位、slot 指去嘅檔名
 */
import { arcIdOf, arcImageFile, entryImageFile, IMAGE_SLOTS } from '@903-player/catalog';
import { isRecord, type Json } from './http';

/** W-746：淨係睇 own key（`in` 會睇埋 prototype：constructor / toString / __proto__） */
export const has = (obj: Json, key: string): boolean => Object.hasOwn(obj, key);

export const slotOf = (field: string) => IMAGE_SLOTS.find((slot) => slot === field);

/** source 有就抄（深 copy），冇就刪 */
export const copyKey = (target: Json, source: Json, key: string) => {
    if (has(source, key)) target[key] = structuredClone(source[key]);
    else delete target[key];
};

export const arcList = (definition: Json): unknown[] =>
    Array.isArray(definition.arcs) ? (definition.arcs as unknown[]) : [];

export const indexOfArc = (arcs: readonly unknown[], arcId: string): number =>
    arcs.findIndex((arc) => isRecord(arc) && arcIdOf(arc) === arcId);

/** 已發佈嘅短篇加返 D1：放喺 published 前面最近、D1 仲有嘅短篇之後 */
export const insertionIndex = (
    arcs: readonly unknown[],
    published: readonly unknown[],
    at: number,
) => {
    for (let i = at - 1; i >= 0; i -= 1) {
        const before = published[i];
        const found = isRecord(before) ? indexOfArc(arcs, arcIdOf(before)) : -1;
        if (found !== -1) return found + 1;
    }
    return 0;
};

/** definition（頂層 + 全部短篇）slot 指去嘅檔名 */
export const referencedFiles = (definition: Json): Set<string> =>
    new Set(
        IMAGE_SLOTS.flatMap((slot) => [
            entryImageFile(definition, slot),
            ...arcList(definition).flatMap((arc) =>
                isRecord(arc) ? [arcImageFile(arc, slot)] : [],
            ),
        ]),
    );
