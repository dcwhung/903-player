/* 變更項目嘅縮圖：短篇有自己唱片就用，冇就用劇集 / 節目唱片 */
import type { ChangeEntryRef, ChangeItem } from '@903-player/catalog';
import type { ImageMap, LoadedEntry, RawDefinition } from '../api/types';
import { arcsOf, imageOf, str, totalEpisodes } from './raw';

const findEntry = (entries: readonly LoadedEntry[], ref: ChangeEntryRef | undefined) =>
    ref && entries.find((e) => e.kind === ref.kind && e.id === ref.id);

const entryOf = (entries: readonly LoadedEntry[], item: ChangeItem) =>
    findEntry(entries, item.entry);

/** 短篇 key 同 catalog arcIdOf 一樣：id，冇就用名 */
const arcKeyOf = (arc: RawDefinition) => str(arc, 'id') ?? str(arc, 'name');

/** 劇集 / 節目自己嘅碟面（確認發佈時間線卡頭） */
export const entryDiscOf = (
    entries: readonly LoadedEntry[],
    ref: ChangeEntryRef,
): string | undefined => {
    const entry = findEntry(entries, ref);
    return entry ? imageOf(entry.definition, entry.images, 'disc') : undefined;
};

export const thumbOf = (entries: readonly LoadedEntry[], item: ChangeItem): string | undefined => {
    const entry = entryOf(entries, item);
    if (!entry) return undefined;
    const arc = item.arc && arcsOf(entry.definition).find((a) => arcKeyOf(a) === item.arc?.id);
    return (
        (arc && imageOf(arc, entry.images, 'disc')) ??
        imageOf(entry.definition, entry.images, 'disc')
    );
};

/** 新劇「全 N 集」 */
export const episodeTotalOf = (entries: readonly LoadedEntry[], item: ChangeItem): number =>
    totalEpisodes(entryOf(entries, item)?.definition ?? {});

/**
 * 短篇碟面：同 player（packages/catalog artFor）一樣次序——短篇自己嘅 → 劇集碟面 →
 * 冇（undefined = Thumb 顯示 player 預設黑碟）
 */
export const arcDiscOf = (
    drama: RawDefinition,
    images: ImageMap,
    arc: RawDefinition,
): string | undefined => imageOf(arc, images, 'disc') ?? imageOf(drama, images, 'disc');

/** 編輯頁標題：已儲存版本嘅碟面（新增 / 未上載 = undefined → 黑碟） */
export const savedDiscOf = (entry: LoadedEntry | null): string | undefined =>
    entry ? imageOf(entry.definition, entry.images, 'disc') : undefined;
