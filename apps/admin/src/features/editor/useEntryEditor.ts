/*
 * 編輯頁狀態：已儲存版本（etag）+ 草稿；儲存（412 / 422 / warnings）、圖片上載即存、復原。
 * 新增模式（initial）：未有 entry，儲存用 If-None-Match: *
 * patchSaved（圖片、配色、R2 自動裁切）：喺「最新」已儲存版本上面改一兩個欄位即刻 PUT（唔連其他未儲存改動），
 * 撞 412（另一個 PUT 啱啱改咗 ETag）就重讀一次再試；草稿跟住 rebase 去新版本（AU-020）。
 * 改劇集 ID 成功但之後 PUT 失敗（RenamedSaveError，AU-013）：已儲存版本同草稿跟去新 ID，
 * 連錯誤暫存（renamedHandoff），新 ID 嗰頁 mount 時接手、唔重新載入
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { VersionConflictError } from '../../api/client';
import { getEntry } from '../../api/endpoints';
import type { EntryKind, LoadedEntry, RawDefinition } from '../../api/types';
import { changedKeys, problemOf, rebaseDraft, type Draft, type Problem } from './entryDraft';
import { persist, RenamedSaveError, type Persisted } from './persist';
import {
    dropRenamedHandoff,
    renamedHandoffFor,
    stashRenamedHandoff,
    type RenamedHandoff,
} from './renamedHandoff';

export interface SaveStatus {
    saving: boolean;
    problem?: Problem | undefined;
    warnings: string[];
}

const IDLE: SaveStatus = { saving: false, warnings: [] };

/** 改 ID 後 PUT 失敗搬過嚟嘅版本（mount 嗰刻攞一次，之後清走暫存） */
const useRenamedHandoff = (kind: EntryKind, id: string): RenamedHandoff | null => {
    const [handoff] = useState(() => renamedHandoffFor(kind, id));
    useEffect(() => dropRenamedHandoff(handoff), [handoff]);
    return handoff;
};

const useLoadedEntry = (kind: EntryKind, id: string, initial?: Draft) => {
    const handoff = useRenamedHandoff(kind, id);
    const [entry, setEntry] = useState<LoadedEntry | null>(handoff?.entry ?? null);
    const [draft, setDraft] = useState<Draft | null>(handoff?.draft ?? initial ?? null);
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
    const skipLoad = initial !== undefined || handoff !== null;
    useEffect(() => {
        if (!skipLoad) void getEntry(kind, id).then(apply, fail);
    }, [skipLoad, kind, id, apply, fail]);
    return { entry, setEntry, draft, setDraft, loadError, reload, handoff };
};

type LoadedState = ReturnType<typeof useLoadedEntry>;

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

/** 最新已儲存版本（ref：連續幾個 PUT 都用最新 ETag，唔等 re-render） */
const useLatest = (entry: LoadedEntry | null) => {
    const latest = useRef(entry);
    useEffect(() => {
        latest.current = entry;
    }, [entry]);
    return latest;
};

/** 儲存失敗 → 要顯示嘅問題；RenamedSaveError 照出原本嘅錯誤，moved = server 已經改咗 ID 嘅版本 + 草稿 */
const failureOf = (error: unknown): { problem: Problem; moved: RenamedHandoff | null } => {
    const renamed = error instanceof RenamedSaveError ? error : null;
    const problem = problemOf(renamed ? renamed.cause : error);
    return { problem, moved: renamed && { entry: renamed.entry, draft: renamed.draft, problem } };
};

/**
 * 儲存狀態 + 最新已儲存版本（ref：連續幾個 PUT 都用最新 ETag）；save = saving → 成功記低新版本 / 失敗記低問題。
 * 改 ID 後 PUT 失敗（moved）：已儲存版本 + 草稿換做改咗 ID 嗰個（再儲存 = 直接 PUT，唔再 rename），連錯誤暫存
 */
const useSaving = ({ entry, setEntry, setDraft, handoff }: LoadedState) => {
    const [status, setStatus] = useState<SaveStatus>(
        handoff ? { ...IDLE, problem: handoff.problem } : IDLE,
    );
    const latestRef = useLatest(entry);
    const follow = (moved: RenamedHandoff) => {
        latestRef.current = moved.entry;
        setEntry(moved.entry);
        setDraft(moved.draft);
        stashRenamedHandoff(moved);
    };
    const save = async (task: () => Promise<Persisted>): Promise<LoadedEntry | null> => {
        setStatus({ ...IDLE, saving: true });
        try {
            const saved = await task();
            latestRef.current = saved.entry;
            setEntry(saved.entry);
            setStatus({ ...IDLE, warnings: saved.warnings });
            return saved.entry;
        } catch (error) {
            const { problem, moved } = failureOf(error);
            if (moved) follow(moved);
            setStatus({ ...IDLE, problem });
            return null;
        }
    };
    return { status, latest: latestRef, save };
};

export const useEntryEditor = (kind: EntryKind, id: string, initial?: Draft) => {
    const loaded = useLoadedEntry(kind, id, initial);
    const { entry, draft, setDraft } = loaded;
    const { status, latest, save } = useSaving(loaded);
    const run = (next: Draft, renameTo?: string) =>
        save(() => persist({ kind, id, entry }, next, renameTo));
    /** 新增模式（未有 entry）：淨係改草稿，跟埋撳「儲存」先寫 */
    const patchSaved = async (apply: (d: Draft) => Draft): Promise<boolean> => {
        const base = latest.current;
        const stored = base && (await save(() => persistPatch(kind, base, apply)));
        if (base && !stored) return false;
        // 重試過嘅話 stored 入面有另一邊嘅改動：草稿要跟去新版本，否則下次儲存會寫返舊值（AU-020）
        setDraft((d) => d && apply(base && stored ? rebaseDraft(base, d, stored) : d));
        return true;
    };
    const setDefinition = (update: (definition: RawDefinition) => RawDefinition) =>
        setDraft((d) => d && { ...d, definition: update(d.definition) });
    const saved: Draft | null = entry ?? (initial ? { definition: {}, images: {} } : null);
    const dirtyKeys = draft && saved ? changedKeys(saved, draft) : [];
    const revert = () => entry && setDraft({ definition: entry.definition, images: entry.images });
    /** 最新已儲存版本嘅 ID（改 ID 之後就算 PUT 失敗都係新 ID）；未有 entry = undefined */
    const savedId = () => latest.current?.id;
    return { ...loaded, status, dirtyKeys, setDefinition, run, patchSaved, revert, savedId };
};

export type EntryEditor = ReturnType<typeof useEntryEditor>;
