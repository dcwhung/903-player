/* API 回應形狀（apps/api/src/{admin,content,catalog}/**，api 0.8.0） */
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
    /** 最新 ok publish 有冇上過架（舊 API 冇 = 唔知） */
    published?: boolean;
    /** 短篇集：上過架嘅短篇 ID（舊 API 冇） */
    publishedArcs?: string[];
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
    /** 由 GET /api/entries 併入（單一 entry GET 冇） */
    published?: boolean | undefined;
    publishedArcs?: string[] | undefined;
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

/** 唔阻 publish 嘅警告（api 0.8.0）：配色對比度唔夠 / 未設定配色（target = '<kind>/<id>'） */
export type PublishWarning =
    | {
          kind: 'contrast';
          target: string;
          foreground: string;
          background: string;
          ratio: number | null;
          minimum: number;
      }
    | { kind: 'neutralTheme'; target: string };

export interface ChangesResponse {
    base: number | null;
    changes: ChangeSummary;
    validation: Validation;
    /** api 0.8.0：舊 API 冇 = 冇警告 */
    warnings?: PublishWarning[];
    /** 首頁 banner（草稿）同最新 publish 唔同 */
    bannerChanged?: boolean;
}

/** 首頁 banner：兩張圖檔名（<hash16>.webp）；null = 內建預設 */
export interface BannerImages {
    standard: string;
    long: string;
}

export interface BannerResponse {
    banner: BannerImages | null;
    updatedAt: string | null;
}

/** GET /api/dramas/:id/sources：R2 資料夾即場掃描到嘅封面原圖（完整 R2 key；冇 = null） */
export interface SourceCovers {
    cdCover: string | null;
    coverPhoto: string | null;
}

export interface DramaSources extends SourceCovers {
    folder: string;
    /** id = null：短篇資料夾對唔到 definition */
    arcs: (SourceCovers & { name: string; id: string | null })[];
}

/** GET /api/publishes 每行嘅 changes（api 0.8.1 加 bannerChanged；舊 api / 舊記錄冇 = 冇換） */
export interface PublishChangeSummary extends ChangeSummary {
    bannerChanged?: boolean;
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
    changes?: PublishChangeSummary;
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
