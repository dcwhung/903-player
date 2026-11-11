/*
 * 編輯頁狀態：已儲存版本（etag）+ 草稿；儲存（412 / 422 / warnings）、圖片上載即存、復原。
 * 新增模式（initial）：未有 entry，儲存用 If-None-Match: *
 */
import { useCallback, useEffect, useState } from 'react';
import { getEntry } from '../../api/endpoints';
import type { EntryKind, LoadedEntry, RawDefinition } from '../../api/types';
import { changedKeys, problemOf, type Draft, type Problem } from './entryDraft';
import { persist } from './persist';

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

export const useEntryEditor = (kind: EntryKind, id: string, initial?: Draft) => {
    const loaded = useLoadedEntry(kind, id, initial);
    const { entry, setEntry, draft, setDraft } = loaded;
    const [status, setStatus] = useState<SaveStatus>(IDLE);
    const run = async (next: Draft, renameTo?: string): Promise<LoadedEntry | null> => {
        setStatus({ ...IDLE, saving: true });
        try {
            const saved = await persist({ kind, id, entry }, next, renameTo);
            setEntry(saved.entry);
            setStatus({ ...IDLE, warnings: saved.warnings });
            return saved.entry;
        } catch (error) {
            setStatus({ ...IDLE, problem: problemOf(error) });
            return null;
        }
    };
    const setDefinition = (update: (definition: RawDefinition) => RawDefinition) =>
        setDraft((d) => d && { ...d, definition: update(d.definition) });
    const saved: Draft | null = entry ?? (initial ? { definition: {}, images: {} } : null);
    const dirtyKeys = draft && saved ? changedKeys(saved, draft) : [];
    const revert = () => entry && setDraft({ definition: entry.definition, images: entry.images });
    return { ...loaded, status, dirtyKeys, setDefinition, run, revert };
};

export type EntryEditor = ReturnType<typeof useEntryEditor>;
