/*
 * 劇集 folder 掃描（R2 / 本機）嘅型別。輸入係 FolderListing：CLI 由 fs 砌，Worker 由 R2 list 砌，
 * 呢個 module 唔郁 fs / 網絡。
 */

/** 一個劇集 folder 嘅兩層 listing（原始檔名，未 normalise） */
export interface FolderListing {
    /** 劇集 folder 名（R2 = audio.folder） */
    name: string;
    /** 劇集 folder 第一層嘅檔 */
    rootFiles: readonly string[];
    /** 第一層嘅 sub-folder；files 入面再深一層嘅 folder 用「名/」表示 */
    arcs: readonly { name: string; files: readonly string[] }[];
}

export type IssueLevel = 'error' | 'warn' | 'info';

export interface Issue {
    level: IssueLevel;
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

export interface DramaScan extends ArcScan {
    arcs: ArcScan[];
}

export interface ArcSummary {
    name: string;
    count: number;
    first?: number | string | undefined;
    last?: number | string | undefined;
    titled?: number;
    covers?: string[];
    ignored?: string[];
}

export type DraftKind = 'series' | 'daily' | 'none';

/** drama.json 草稿（同手寫 drama.json 一樣嘅 JSON；未經 parseDramaDefinition 驗） */
export type DraftJson = Record<string, unknown>;

/** 草稿 / existing 入面嘅一個短篇（未驗證，只知道有 name） */
export interface DraftArc {
    id?: string;
    name: string;
    firstNo?: number;
    episodes?: number | readonly (string | null)[];
    titles?: Record<string, string>;
    files?: Record<string, string>;
    [key: string]: unknown;
}

export interface DraftResult {
    scan: DramaScan;
    kind: DraftKind;
    today: string;
    template?: string;
    issues: Issue[];
    summaries: ArcSummary[];
    /** 有 error 就係 null（唔好寫 / 唔好存） */
    json: DraftJson | null;
}

export interface DraftOptions {
    /** app 嘅 id（只用嚟檢查格式） */
    id?: string | undefined;
    /** 現有 drama.json（object）；有就合併，人手欄位照留 */
    existing?: unknown;
    /** 香港日期 YYYY-MM-DD（新短篇 / 新劇嘅 addedAt） */
    today: string;
}
