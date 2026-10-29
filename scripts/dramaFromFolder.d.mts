/*
 * dramaFromFolder.mjs 嘅型別（只畀 repo 入面嘅 TypeScript test 用）。
 * 用戶只下載 .mjs 一個檔，呢個 .d.mts 唔使跟。
 */
export type DramaJson = Record<string, unknown>;

export interface Issue {
    level: 'error' | 'warn' | 'info';
    where: string;
    message: string;
}

export interface ArcScan {
    rawName: string;
    name: string;
    audio: string[];
    covers: string[];
    ignored: string[];
}

export interface DramaScan {
    rawName: string;
    name: string;
    audio: string[];
    covers: string[];
    ignored: string[];
    arcs: ArcScan[];
}

export interface ArcSummary {
    name: string;
    count: number;
    first?: number | string;
    last?: number | string;
    titled?: number;
    covers?: string[];
    ignored?: string[];
}

export interface DraftResult {
    scan: DramaScan;
    kind: 'series' | 'daily' | 'none';
    today: string;
    template?: string;
    issues: Issue[];
    summaries: ArcSummary[];
    /** 有 error 就係 null（唔寫檔） */
    json: DramaJson | null;
}

export interface ParsedEpisodeFile {
    file: string;
    no: number;
    zhNo: number | undefined;
    label: string;
    title: string;
    ext: string;
}

export interface VerifyFailure {
    url: string;
    reason: string;
}

export interface CliIo {
    out?: (text: string) => void;
    now?: () => Date;
    fetch?: typeof fetch;
    /** 預檢用：個路徑寫唔寫得入（預設 accessSync W_OK） */
    canWrite?: (path: string) => boolean;
}

export const DRAMA_AUDIO_BASE: string;
export const SERIES_TEMPLATES: readonly string[];
export const DAILY_TEMPLATE: string;
export const EXIT: Readonly<{
    ok: 0;
    blocked: 1;
    usage: 2;
    verifyFailed: 3;
    internal: 4;
    reportFailed: 5;
}>;
export const USAGE: string;

export function toChineseNumeral(n: number): string;
export function parseEpisodeNumeral(text: string): number | undefined;
export function renderFileName(template: string, tokens: Readonly<Record<string, string>>): string;
export function encodePath(segments: readonly string[]): string;
export function findSuspicious(name: string): string[];
export function scanDramaFolder(root: string): DramaScan;
export function parseEpisodeFileName(file: string): ParsedEpisodeFile | null;
export function todayInHongKong(now: Date): string;
export function generateDraft(
    root: string,
    options: { id?: string; existing?: unknown; now: Date },
): DraftResult;
export function formatReport(result: DraftResult, options?: { existing?: unknown }): string;
export function episodeUrls(json: DramaJson, base?: string): string[];
export function coverUrls(scan: DramaScan, folder: string, base?: string): string[];
export function verifyUrls(
    urls: readonly string[],
    options?: {
        concurrency?: number;
        timeoutMs?: number;
        retryDelayMs?: number;
        fetch?: typeof fetch;
    },
): Promise<VerifyFailure[]>;
export function run(argv: readonly string[], io?: CliIo): Promise<number>;
