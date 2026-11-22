/*
 * 編輯頁儲存：（劇集改 ID 先 rename）→ PUT entry（If-Match / 新增 If-None-Match）。
 * rename 時 server 會將自動編號嘅短篇 ID（<舊 ID>-NN）改做 <新 ID>-NN；草稿用同一條規則
 *（@903-player/catalog withRenamedArcIds）跟住改先 PUT，否則 PUT 會寫返舊短篇 ID（AU-013）。
 * rename 成功但 PUT 失敗 → RenamedSaveError：server 已經喺新 ID，editor 要跟過去
 */
import { withRenamedArcIds } from '@903-player/catalog';
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

/** rename 已經成功、之後嘅 PUT 失敗：entry = server 而家儲存嘅版本（新 ID / ETag），draft = 跟住改咗短篇 ID 嘅草稿 */
export class RenamedSaveError extends Error {
    override readonly name = 'RenamedSaveError';

    constructor(
        readonly entry: LoadedEntry,
        readonly draft: Draft,
        cause: unknown,
    ) {
        super(`saving ${entry.id} failed after the rename`, { cause });
    }
}

/** 劇集改 ID：回 server 而家儲存嘅版本（新 ID / ETag，已儲存 definition 嘅短篇 ID 跟住改） */
const renamed = async (entry: LoadedEntry, newId: string): Promise<LoadedEntry> => {
    const { data } = await renameDrama(entry.id, newId, entry.etag);
    return {
        ...entry,
        id: data.id,
        definition: withRenamedArcIds(entry.definition, entry.id, data.id),
        updatedAt: data.updatedAt,
        etag: etagOf(data.updatedAt),
    };
};

const put = async (target: PersistTarget, draft: Draft): Promise<Persisted> => {
    const { kind, id, entry } = target;
    const { data } = await putEntry(kind, id, draft, entry?.etag ?? null);
    const base: LoadedEntry = entry ?? {
        kind,
        id,
        ...draft,
        draft: false,
        updatedAt: data.updatedAt,
        etag: null,
    };
    return { entry: savedEntry(base, draft, data), warnings: data.warnings.missingEpisodeIds };
};

const renameThenPut = async (entry: LoadedEntry, draft: Draft, newId: string) => {
    const moved = await renamed(entry, newId);
    const next = { ...draft, definition: withRenamedArcIds(draft.definition, entry.id, moved.id) };
    try {
        return await put({ kind: entry.kind, id: moved.id, entry: moved }, next);
    } catch (error) {
        throw new RenamedSaveError(moved, next, error);
    }
};

export const persist = (
    target: PersistTarget,
    draft: Draft,
    renameTo?: string,
): Promise<Persisted> => {
    const { entry } = target;
    if (entry && renameTo && renameTo !== entry.id) return renameThenPut(entry, draft, renameTo);
    return put({ ...target, id: entry?.id ?? renameTo ?? target.id }, draft);
};
