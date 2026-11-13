/*
 * R2 原圖自動裁切（用戶 2026-11-12，mockup admin-phase4 ① 狀態 A）：開劇集編輯頁 / 重新掃描之後，
 * 已儲存版本有 slot 冇圖 → GET sources → 有原圖 key → r2-source → 置中裁切 → PUT /api/assets →
 * 全部做完一次 PUT entry（patchSaved：最新 ETag，412 重讀再試）。Slot 有圖唔郁。
 * 每個 slot 喺呢個編輯頁只試一次（attempted ref：StrictMode effect 行兩次、每次儲存都會再觸發，都唔會重複）；
 * ⟳ 重新掃描之後 retry：已儲存版本仲係冇圖嘅 slot 再試一次（用戶可能啱啱放咗原圖入 R2），做緊嘅 slot 唔會重複。
 * 掃描先發現嘅新短篇未儲存，要「儲存」之後先由 updatedAt effect 觸發。
 * 冇原圖（null / 404）或者唔係 R2 劇（400 / 404 / 422）靜靜雞略過；其他失敗 slot 下面顯示錯誤、slot 留空
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { fetchR2Source, getDramaSources, uploadAsset } from '../../api/endpoints';
import { errorMessage } from '../../api/errorMessage';
import type { DramaSources, LoadedEntry } from '../../api/types';
import { isRecord } from '../../model/raw';
import type { AutoCropStatus } from '../../ui/ImageSlot';
import { prepareImage } from '../../ui/imageCrop';
import type { ImageSlotKind } from '../../ui/imageUpload';
import type { Draft } from '../editor/entryDraft';
import { withImage } from '../editor/useImageSave';
import { fileNameOf, missingSlots, planAutoCrop, slotKey, type AutoCropJob } from './r2AutoCrop';

const R2_HOST = 'r2';
const NOT_FOUND = 404;

interface AutoCropEditor {
    entry: LoadedEntry | null;
    patchSaved: (apply: (d: Draft) => Draft) => Promise<boolean>;
}

type Statuses = Record<string, AutoCropStatus>;

const isR2 = (entry: LoadedEntry) =>
    isRecord(entry.definition.audio) && entry.definition.audio.host === R2_HOST;

const isNotFound = (error: unknown) => error instanceof ApiError && error.status === NOT_FOUND;

/** 400 / 404 / 422（唔係 R2 劇、冇呢套劇）同其他失敗都靜靜雞略過：唔知邊個 slot 有原圖，唔好亂出錯 */
const loadSources = async (id: string): Promise<DramaSources | null> => {
    try {
        return await getDramaSources(id);
    } catch {
        return null;
    }
};

/** 一個 slot：攞原圖 → 裁切 → 上載；null = 冇原圖（略過） */
const cropOne = async (job: AutoCropJob): Promise<{ name: string } | { error: string } | null> => {
    try {
        const prepared = await prepareImage(await fetchR2Source(job.sourceKey), job.slot);
        if ('error' in prepared) return prepared;
        return await uploadAsset(prepared.blob);
    } catch (error) {
        return isNotFound(error) ? null : { error: errorMessage(error) };
    }
};

type SetStatus = (keys: string[], status: AutoCropStatus | null) => void;

/** 每個 slot 嘅狀態（key = slotKey）；statusOf(arcId) = 嗰個劇集 / 短篇兩個 slot */
const useStatuses = () => {
    const [statuses, setStatuses] = useState<Statuses>({});
    const set: SetStatus = useCallback(
        (keys, status) =>
            setStatuses((current) => {
                const next = { ...current };
                keys.forEach((key) => (status ? (next[key] = status) : delete next[key]));
                return next;
            }),
        [],
    );
    const statusOf = (arcId?: string): Partial<Record<ImageSlotKind, AutoCropStatus>> =>
        Object.fromEntries(
            (['disc', 'tile'] as const).flatMap((slot) => {
                const status = statuses[slotKey(slot, arcId)];
                return status ? [[slot, status]] : [];
            }),
        );
    return { set, statusOf };
};

/** 試過邊啲 slot（attempted）+ 做緊邊啲（inFlight）；claim = 揀未試過嘅、記低；forget = 重新掃描後再試 */
const useAttempts = () => {
    const attempted = useRef(new Set<string>());
    const inFlight = useRef(new Set<string>());
    const claim = useCallback((keys: string[]) => {
        const fresh = keys.filter((key) => !attempted.current.has(key));
        fresh.forEach((key) => {
            attempted.current.add(key);
            inFlight.current.add(key);
        });
        return fresh;
    }, []);
    const release = useCallback((keys: string[]) => {
        keys.forEach((key) => inFlight.current.delete(key));
    }, []);
    const forget = useCallback(() => {
        attempted.current = new Set(inFlight.current);
    }, []);
    return { claim, release, forget };
};

interface AutoCropRun {
    id: string;
    editorRef: { current: AutoCropEditor };
    set: SetStatus;
    claim: (keys: string[]) => string[];
    release: (keys: string[]) => void;
}

/** 已儲存版本冇圖、未試過嘅 slot → sources → 逐個裁切上載 → 一次儲存 */
const autoCrop = async ({ id, editorRef, set, claim, release }: AutoCropRun) => {
    const entry = editorRef.current.entry;
    if (!entry || !isR2(entry)) return;
    const missing = claim(missingSlots(entry.definition, entry.images));
    if (missing.length === 0) return;
    try {
        const sources = await loadSources(id);
        if (!sources) return;
        const jobs = planAutoCrop(entry.definition, entry.images, sources);
        await runJobs(
            jobs.filter((job) => missing.includes(job.key)),
            editorRef,
            set,
        );
    } finally {
        release(missing);
    }
};

export const useR2AutoCrop = (id: string, editor: AutoCropEditor) => {
    const { set, statusOf } = useStatuses();
    const { claim, release, forget } = useAttempts();
    const editorRef = useRef(editor);
    useEffect(() => {
        editorRef.current = editor;
    });
    const run = useCallback(
        () => autoCrop({ id, editorRef, set, claim, release }),
        [id, set, claim, release],
    );
    /** 重新掃描後：忘記試過邊啲 slot（做緊嗰啲除外）再行一次 */
    const retry = useCallback(() => {
        forget();
        return run();
    }, [forget, run]);
    const updatedAt = editor.entry?.updatedAt;
    useEffect(() => {
        if (updatedAt !== undefined) void run();
    }, [updatedAt, run]);
    return { statusOf, retry };
};

/** 逐個 slot 做（同一時間只 decode 一張大圖），最後一次過儲存 */
const runJobs = async (
    jobs: AutoCropJob[],
    editorRef: { current: AutoCropEditor },
    set: SetStatus,
) => {
    set(
        jobs.map((job) => job.key),
        { status: 'loading' },
    );
    const done: { job: AutoCropJob; name: string }[] = [];
    for (const job of jobs) {
        const result = await cropOne(job);
        if (result === null) set([job.key], null);
        else if ('error' in result) set([job.key], { status: 'error', message: result.error });
        else done.push({ job, name: result.name });
    }
    if (done.length === 0) return;
    const apply = (draft: Draft) =>
        done.reduce((d, { job, name }) => withImage(job.slot, name, job.arcId)(d), draft);
    // 儲存失敗：編輯頁頂嘅 EditorNotices 已經顯示原因，slot 留空
    const saved = await editorRef.current.patchSaved(apply);
    done.forEach(({ job }) =>
        set([job.key], saved ? { status: 'done', file: fileNameOf(job.sourceKey) } : null),
    );
};
