/* API 回應形狀（apps/api/src/{admin,content,catalog}/**，api 0.4.0） */
import type { ChangeSummary, ExpandedSchedule, ScheduleRule } from '@903-player/catalog';

export type EntryKind = 'shows' | 'dramas';

/** D1 入面嘅 definition（未驗證，逐個欄位小心讀） */
export type RawDefinition = Record<string, unknown>;

/** definition 入面嘅檔名 → 圖檔名（<hash>.webp） */
export type ImageMap = Record<string, string>;

export interface EntrySummary {
    kind: EntryKind;
    id: string;
    name: unknown;
    enabled: boolean;
    draft: boolean;
    updatedAt: string;
}

export interface EntryDetail {
    definition: RawDefinition;
    images: ImageMap;
    draft: boolean;
    updatedAt: string;
}

export interface LoadedEntry extends EntryDetail {
    kind: EntryKind;
    id: string;
    etag: string | null;
}

export interface SaveResult {
    updatedAt: string;
    draft: boolean;
    warnings: { missingEpisodeIds: string[] };
}

export type CellState = 'done' | 'must' | 'optional' | 'na';
export type TodoColumn = 'folder' | 'id' | 'images' | 'schedule' | 'summary';
export type FindingKind = 'newDrama' | 'newArc' | 'newEpisodes' | 'missingFolder';

export interface TodoCell {
    state: CellState;
    target?: string;
}

export interface TodoRow {
    kind: FindingKind;
    findingIds: number[];
    dramaId: string;
    arcId: string | null;
    name: string;
    cells: Record<TodoColumn, TodoCell>;
}

export interface TodosResponse {
    rows: TodoRow[];
    blocking: number;
}

export interface Finding {
    id: number;
    kind: FindingKind;
    dramaId: string;
    arcId: string | null;
    detail: Record<string, unknown>;
    createdAt: string;
}

export interface ScanResponse {
    scannedAt: string;
    findings: Finding[];
    skipped: { dramaId?: string; folder: string; issues: unknown[] }[];
}

export type Validation = { ok: true; episodeCount: number } | { ok: false; error: string };

export interface ChangesResponse {
    base: number | null;
    changes: ChangeSummary;
    validation: Validation;
}

export interface PublishSummary {
    id: number;
    createdAt: string;
    createdBy: string;
    hash: string;
    showCount: number;
    dramaCount: number;
    episodeCount: number;
    rollbackOf: number | null;
    status: 'ok' | 'failed' | string;
    error: string | null;
    current: boolean;
    changes?: ChangeSummary;
}

export interface ScheduleState {
    rule: ScheduleRule;
    expanded: ExpandedSchedule | null;
    updatedAt: string;
    error?: string;
}

export interface DramaScanResponse {
    draft: RawDefinition | null;
    issues: unknown[];
    diff: unknown[];
}
