/* 變更項目嘅縮圖：短篇有自己唱片就用，冇就用劇集 / 節目唱片 */
import type { ChangeItem } from '@903-player/catalog';
import type { LoadedEntry } from '../api/types';
import { arcsOf, imageOf, totalEpisodes } from './raw';

const entryOf = (entries: readonly LoadedEntry[], item: ChangeItem) =>
    item.entry && entries.find((e) => e.kind === item.entry?.kind && e.id === item.entry.id);

export const thumbOf = (entries: readonly LoadedEntry[], item: ChangeItem): string | undefined => {
    const entry = entryOf(entries, item);
    if (!entry) return undefined;
    const arc = item.arc && arcsOf(entry.definition).find((a) => a.id === item.arc?.id);
    return (
        (arc && imageOf(arc, entry.images, 'disc')) ??
        imageOf(entry.definition, entry.images, 'disc')
    );
};

/** 新劇「全 N 集」 */
export const episodeTotalOf = (entries: readonly LoadedEntry[], item: ChangeItem): number =>
    totalEpisodes(entryOf(entries, item)?.definition ?? {});
