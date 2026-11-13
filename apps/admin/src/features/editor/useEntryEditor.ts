/*
 * 編輯頁狀態：已儲存版本（etag）+ 草稿；儲存（412 / 422 / warnings）、圖片上載即存、復原。
 * 新增模式（initial）：未有 entry，儲存用 If-None-Match: *
 * patchSaved（圖片、配色、R2 自動裁切）：喺「最新」已儲存版本上面改一兩個欄位即刻 PUT（唔連其他未儲存改動），
 * 撞 412（另一個 PUT 啱啱改咗 ETag）就重讀一次再試
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { VersionConflictError } from '../../api/client';
import { getEntry } from '../../api/endpoints';
import type { EntryKind, LoadedEntry, RawDefinition } from '../../api/types';
import { changedKeys, problemOf, type Draft, type Problem } from './entryDraft';
import { persist, type Persisted } from './persist';

export interface SaveStatus {
    saving: boolean;
    problem?: Problem | undefined;
    warnings: string[];
}

const IDLE: SaveStatus = { saving: false, warnings: [] };

const useLoadedEntry = (kind: EntryKind, id: string, initial?: Draft) => {
    const [entry, setEntry] = useState<LoadedEntry | null>(null);
    const [draft, setDraft] = useState<Draft | null>(initial ?? null);
    const [loadError, setLoadError] = useState<Error>();
    const apply = useCallback((loaded: LoadedEntry) => {
        setEntry(loaded);
        setDraft({ definition: loaded.definition, images: loaded.images });
        setLoadError(undefined);
    }, []);
    const fail = useCallback(
        (error: unknown) => setLoadError(error instanceof Error ? error : new Error(String(error))),
        [],
    );
    const reload = useCallback(() => getEntry(kind, id).then(apply, fail), [kind, id, apply, fail]);
    const isNew = initial !== undefined;
    useEffect(() => {
        if (!isNew) void getEntry(kind, id).then(apply, fail);
    }, [isNew, kind, id, apply, fail]);
    return { entry, setEntry, draft, setDraft, loadError, reload };
};

/** 已儲存版本 + 改動 → PUT；412 就攞最新版本再試一次 */
const persistPatch = async (kind: EntryKind, base: LoadedEntry, apply: (d: Draft) => Draft) => {
    const attempt = (entry: LoadedEntry) => persist({ kind, id: entry.id, entry }, apply(entry));
    try {
        return await attempt(base);
    } catch (error) {
        if (!(error instanceof VersionConflictError)) throw error;
        return attempt(await getEntry(kind, base.id));
    }
};

/** 儲存狀態 + 最新已儲存版本（ref：連續幾個 PUT 都用最新 ETag）；save = saving → 成功記低新版本 / 失敗記低問題 */
const useSaving = (entry: LoadedEntry | null, setEntry: (entry: LoadedEntry) => void) => {
    const [status, setStatus] = useState<SaveStatus>(IDLE);
    const latest = useRef(entry);
    useEffect(() => {
        latest.current = entry;
    }, [entry]);
    const save = async (task: () => Promise<Persisted>): Promise<LoadedEntry | null> => {
        setStatus({ ...IDLE, saving: true });
        try {
            const saved = await task();
            latest.current = saved.entry;
            setEntry(saved.entry);
            setStatus({ ...IDLE, warnings: saved.warnings });
            return saved.entry;
        } catch (error) {
            setStatus({ ...IDLE, problem: problemOf(error) });
            return null;
        }
    };
    return { status, latest, save };
};

export const useEntryEditor = (kind: EntryKind, id: string, initial?: Draft) => {
    const loaded = useLoadedEntry(kind, id, initial);
    const { entry, setEntry, draft, setDraft } = loaded;
    const { status, latest, save } = useSaving(entry, setEntry);
    const run = (next: Draft, renameTo?: string) =>
        save(() => persist({ kind, id, entry }, next, renameTo));
    /** 新增模式（未有 entry）：淨係改草稿，跟埋撳「儲存」先寫 */
    const patchSaved = async (apply: (d: Draft) => Draft): Promise<boolean> => {
        const base = latest.current;
        if (base && !(await save(() => persistPatch(kind, base, apply)))) return false;
        setDraft((d) => d && apply(d));
        return true;
    };
    const setDefinition = (update: (definition: RawDefinition) => RawDefinition) =>
        setDraft((d) => d && { ...d, definition: update(d.definition) });
    const saved: Draft | null = entry ?? (initial ? { definition: {}, images: {} } : null);
    const dirtyKeys = draft && saved ? changedKeys(saved, draft) : [];
    const revert = () => entry && setDraft({ definition: entry.definition, images: entry.images });
    return { ...loaded, status, dirtyKeys, setDefinition, run, patchSaved, revert };
};

export type EntryEditor = ReturnType<typeof useEntryEditor>;
