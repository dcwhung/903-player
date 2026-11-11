/* 編輯頁儲存：（劇集改 ID 先 rename）→ PUT entry（If-Match / 新增 If-None-Match） */
import { putEntry, renameDrama } from '../../api/endpoints';
import type { EntryKind, LoadedEntry } from '../../api/types';
import { etagOf, savedEntry, type Draft } from './entryDraft';

export interface PersistTarget {
    kind: EntryKind;
    id: string;
    /** null = 新增 */
    entry: LoadedEntry | null;
}

export interface Persisted {
    entry: LoadedEntry;
    warnings: string[];
}

const renamed = async (entry: LoadedEntry, newId: string): Promise<LoadedEntry> => {
    const { data } = await renameDrama(entry.id, newId, entry.etag);
    return { ...entry, id: data.id, updatedAt: data.updatedAt, etag: etagOf(data.updatedAt) };
};

export const persist = async (
    target: PersistTarget,
    draft: Draft,
    renameTo?: string,
): Promise<Persisted> => {
    let entry = target.entry;
    if (entry && renameTo && renameTo !== entry.id) entry = await renamed(entry, renameTo);
    const id = entry?.id ?? renameTo ?? target.id;
    const { data } = await putEntry(target.kind, id, draft, entry?.etag ?? null);
    const base: LoadedEntry = entry ?? {
        kind: target.kind,
        id,
        ...draft,
        draft: false,
        updatedAt: data.updatedAt,
        etag: null,
    };
    return { entry: savedEntry(base, draft, data), warnings: data.warnings.missingEpisodeIds };
};
