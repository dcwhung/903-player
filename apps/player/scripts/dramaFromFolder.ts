#!/usr/bin/env -S npx tsx
/*
 * dramaFromFolder.ts：由本機嘅廣播劇 folder（照原樣上載去 Cloudflare R2 嗰份）
 * 生成 903-player 用嘅 drama.json 草稿，同埋一份檢查報告。
 *
 *   npm run drama-from-folder -w apps/player -- "<劇集 folder>" [--id <id>] [--existing <drama.json>]
 *                                              [--out <檔案>] [--force] [--report <檔案>] [--verify]
 *
 * 掃描 / 草稿規則喺 @903-player/catalog（packages/catalog/src/scan/，Worker 嘅 R2 掃描都用同一套）；
 * 呢度只負責 argv、由 fs 砌 FolderListing、寫檔、--verify HEAD 同報告格式。
 */
import {
    accessSync,
    constants as fsConstants,
    existsSync,
    readFileSync,
    readdirSync,
    realpathSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
    coverUrls,
    DRAMA_AUDIO_BASE,
    episodeUrls,
    generateDraft,
    type ArcSummary,
    type DraftResult,
    type FolderListing,
    type Issue,
} from '@903-player/catalog';

/**
 * 0：成功；1：有錯誤，冇寫檔；2：參數錯（包括 --out / --report 路徑錯 / 冇權限），冇寫檔；3：已寫檔但 --verify 有網址唔得；
 * 4：程式本身出錯（唔係 folder 問題，要將成段輸出傳返嚟）；
 * 5：drama.json 已寫好，只係最尾寫唔到 --report 報告檔（預檢過咗之後先出事，例如磁碟滿）
 */
export const EXIT = Object.freeze({
    ok: 0,
    blocked: 1,
    usage: 2,
    verifyFailed: 3,
    internal: 4,
    reportFailed: 5,
} as const);
type ExitCode = (typeof EXIT)[keyof typeof EXIT];
/** 呢啲 exit code 代表 drama.json 已經寫咗（報告檔寫唔到時要講清楚） */
const DRAFT_WRITTEN_CODES: ReadonlySet<number> = new Set([EXIT.ok, EXIT.verifyFailed]);

/** 見過嘅封面檔名：cover photo.png / cover photo.jpg / cover-photo.jpg */
const STANDARD_COVER = /^cover[ -]photo\.(jpe?g|png)$/i;
const HONG_KONG_TIME_ZONE = 'Asia/Hong_Kong';
const VERIFY_CONCURRENCY = 6;
const VERIFY_TIMEOUT_MS = 10_000;
/** r2.dev 有 rate limit：429 / 5xx / 逾時等一陣再試一次 */
const VERIFY_RETRY_DELAY_MS = 1_000;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MIN = 500;
const JSON_INDENT = 4;
/** 冇 --out 時預設輸出檔名 = <id 或劇名> + 呢個尾 */
const DRAFT_EXTENSION = '.drama.json';
/** --report 係 folder 時建議嘅檔名（唔好叫人寫 drama.json，會同輸出檔撞名） */
const REPORT_EXAMPLE_NAME = 'report.txt';
/** 預設輸出檔撞 folder 時，例子入面「第二個 folder」嘅位置 */
const OTHER_FOLDER_PLACEHOLDER = '<另一個 folder>';
const FOLDER_SUFFIX = '/';

/* ───────────── 讀 folder ───────────── */

const namesIn = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).map((entry) =>
        entry.isDirectory() ? `${entry.name}${FOLDER_SUFFIX}` : entry.name,
    );

/** 本機劇集 folder → FolderListing（兩層；第二層 folder 用「名/」） */
export const listFolder = (root: string): FolderListing => {
    const entries = readdirSync(root, { withFileTypes: true });
    return {
        name: basename(resolve(root)),
        rootFiles: entries.filter((e) => !e.isDirectory()).map((e) => e.name),
        arcs: entries
            .filter((e) => e.isDirectory())
            .map((e) => ({ name: e.name, files: namesIn(join(root, e.name)) })),
    };
};

/**
 * 香港日期 YYYY-MM-DD。用 formatToParts 逐部份砌：唔靠某個 locale 嘅格式
 * （例如 en-CA 剛好係 YYYY-MM-DD，但 small-icu 嘅 Node 會退返 en-US 出 10/29/2026）。
 */
export const todayInHongKong = (now: Date): string => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: HONG_KONG_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
};

/** 讀 folder → 草稿（options.existing：舊 drama.json object） */
export const draftFromFolder = (
    root: string,
    { id, existing, now }: { id?: string | undefined; existing?: unknown; now: Date },
): DraftResult => generateDraft(listFolder(root), { id, existing, today: todayInHongKong(now) });

/* ───────────── --verify ───────────── */

interface HeadFailure {
    url: string;
    reason: string;
    retryable: boolean;
}

export interface VerifyFailure {
    url: string;
    reason: string;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const errorName = (error: unknown): string | undefined => (error as Error | undefined)?.name;

/** 一次 HEAD：OK 就 null；唔得就 { url, reason, retryable }（429 / 5xx / 逾時值得再試） */
const headOnce = async (
    url: string,
    fetchImpl: FetchLike,
    timeoutMs: number,
): Promise<HeadFailure | null> => {
    try {
        const res = await fetchImpl(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.ok) return null;
        const retryable =
            res.status === HTTP_TOO_MANY_REQUESTS || res.status >= HTTP_SERVER_ERROR_MIN;
        return { url, reason: `HTTP ${res.status}`, retryable };
    } catch (error) {
        const timedOut = errorName(error) === 'TimeoutError' || errorName(error) === 'AbortError';
        const detail = (error as Error | undefined)?.message ?? String(error);
        const reason = timedOut ? `逾時（${timeoutMs}ms）` : `連線失敗：${detail}`;
        return { url, reason, retryable: timedOut };
    }
};

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** 暫時性失敗（429 / 5xx / 逾時）等一陣再試一次；404 之類即刻當唔得 */
const headWithRetry = async (
    url: string,
    fetchImpl: FetchLike,
    { timeoutMs, retryDelayMs }: { timeoutMs: number; retryDelayMs: number },
): Promise<VerifyFailure | null> => {
    const first = await headOnce(url, fetchImpl, timeoutMs);
    if (first === null || !first.retryable) return first && { url, reason: first.reason };
    await sleep(retryDelayMs);
    const second = await headOnce(url, fetchImpl, timeoutMs);
    return second && { url, reason: `${second.reason}（再試一次都唔得）` };
};

export interface VerifyOptions {
    concurrency?: number;
    timeoutMs?: number;
    retryDelayMs?: number;
    fetch?: FetchLike;
}

/** HEAD 每條網址（限同時幾多條 + timeout + 暫時性失敗再試一次），回傳唔得嘅（跟原本次序） */
export const verifyUrls = async (
    urls: readonly string[],
    options: VerifyOptions = {},
): Promise<VerifyFailure[]> => {
    const {
        concurrency = VERIFY_CONCURRENCY,
        timeoutMs = VERIFY_TIMEOUT_MS,
        retryDelayMs = VERIFY_RETRY_DELAY_MS,
    } = options;
    const fetchImpl: FetchLike = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    const results: (VerifyFailure | null)[] = new Array<VerifyFailure | null>(urls.length).fill(
        null,
    );
    let next = 0;
    const worker = async () => {
        while (next < urls.length) {
            const index = next++;
            const delays = { timeoutMs, retryDelayMs };
            results[index] = await headWithRetry(urls[index] ?? '', fetchImpl, delays);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
    return results.filter((r): r is VerifyFailure => r !== null);
};

/* ───────────── 報告 ───────────── */

const LEVEL_LABELS: Record<Issue['level'], string> = {
    error: '[錯誤]',
    warn: '[注意]',
    info: '[資料]',
};

const rangeText = (s: ArcSummary) =>
    s.first === s.last ? `第 ${s.first} 集` : `第 ${s.first}–${s.last} 集`;

const arcLine = (s: ArcSummary, i: number): string => {
    const covers = s.covers ?? [];
    const titled = (s.titled ?? 0) > 0 ? `，${s.titled} 集有集名` : '';
    const coverText = covers.length > 0 ? `；封面：${covers.join('、')}` : '；冇封面';
    const nonStandard = covers.filter((c) => !STANDARD_COVER.test(c.normalize('NFC')));
    const odd = nonStandard.length > 0 ? `（唔常見嘅封面檔名：${nonStandard.join('、')}）` : '';
    const counted = s.count > 0 ? `${s.count} 集（${rangeText(s)}）${titled}` : '冇錄音';
    return `  ${i + 1}. ${s.name}：${counted}${coverText}${odd}`;
};

const dailyLine = (s: ArcSummary) =>
    `  每日劇：${s.count} 集（${s.first ?? '-'} 至 ${s.last ?? '-'}）`;

const ignoredLines = (scan: DraftResult['scan']): string[] => {
    const top = scan.ignored.map((f) => `  ${f}`);
    const arcs = scan.arcs.flatMap((a) => a.ignored.map((f) => `  ${a.name}/${f}`));
    const lines = [...top, ...arcs];
    return lines.length > 0 ? ['', `已略過嘅檔案（${lines.length} 個）：`, ...lines] : [];
};

const issueLines = (issues: readonly Issue[]): string[] => {
    if (issues.length === 0) return ['', '問題：冇'];
    const ordered = (['error', 'warn', 'info'] as const).flatMap((level) =>
        issues.filter((i) => i.level === level),
    );
    return [
        '',
        '問題：',
        ...ordered.map((i) => `  ${LEVEL_LABELS[i.level]} ${i.where}：${i.message}`),
    ];
};

const nextStepLines = (result: DraftResult, existing: unknown): string[] => {
    if (existing || result.json === null) return [];
    return [
        '',
        '上架前要補：',
        '  - id（app folder 名，細楷英數同連字號），theme 色調（而家係中性色），enabled 改 true',
        `  - tile.webp / disc.webp（由劇集封面：${result.scan.covers.join('、') || '冇'}）`,
        '  - 短篇次序跟 R2 listing（UTF-8 字典序）；要按播出次序就手動調',
    ];
};

/** 成份報告（純文字，畀用戶 copy 返嚟） */
export const formatReport = (
    result: DraftResult,
    { existing }: { existing?: unknown } = {},
): string => {
    const { scan, summaries } = result;
    const header = [
        `劇集 folder：${scan.name}（${result.kind === 'daily' ? '每日劇' : '短篇劇'}）`,
    ];
    if (result.template) header.push(`檔名 template：${result.template}`);
    header.push(`劇集封面：${scan.covers.join('、') || '冇'}`);
    const body =
        result.kind === 'daily'
            ? summaries.map(dailyLine)
            : ['', `短篇（${summaries.length} 個）：`, ...summaries.map(arcLine)];
    return [
        ...header,
        ...body,
        ...issueLines(result.issues),
        ...ignoredLines(scan),
        ...nextStepLines(result, existing),
    ].join('\n');
};

/* ───────────── CLI ───────────── */

export const USAGE = `用法：npm run drama-from-folder -w apps/player -- "<劇集 folder>" [--id <id>] [--existing <drama.json>] [--out <檔案>] [--force] [--report <檔案>] [--verify]`;

const OPTIONS = {
    id: { type: 'string' },
    existing: { type: 'string' },
    out: { type: 'string' },
    /** 輸出檔已經存在都照寫（預設唔覆蓋，免得冚走人手改過嘅 drama.json） */
    force: { type: 'boolean', default: false },
    /** 報告同時用 UTF-8 寫落呢個檔（Windows PowerShell 嘅 | tee 會用 Big5 / UTF-16 搞亂中文） */
    report: { type: 'string' },
    verify: { type: 'boolean', default: false },
    /** 測試用：換 R2 網址前綴（例如本機 server） */
    base: { type: 'string', default: DRAMA_AUDIO_BASE },
} as const;

interface Args {
    folder: string;
    id?: string | undefined;
    existing?: string | undefined;
    out?: string | undefined;
    force: boolean;
    report?: string | undefined;
    verify: boolean;
    base: string;
}

/** 路徑尾嘅 / 或者 \（Windows 用 \，macOS 拖 folder 入 Terminal 有時會加 /）；根目錄（/、C:\）唔郁 */
const TRAILING_SEPARATORS = /(?<=[^:\\/])[\\/]+$/;

/**
 * Windows 用雙引號包住路徑而尾有 \（"D:\劇\"）：\" 會變做字面嘅 "，後面嘅參數仲會黐埋落嚟，
 * 所以路徑有 " 就直接講點改；冇嘅話食走尾嘅分隔符。
 */
const folderArg = (raw: string): string => {
    if (raw.includes('"'))
        throw new Error(
            `路徑入面有「"」：${raw}\n用雙引號包住路徑嗰陣，路徑尾唔好加 \\（例如 "D:\\劇\\黃金少年"）`,
        );
    return raw.replace(TRAILING_SEPARATORS, '');
};

const readArgs = (argv: readonly string[]): Args => {
    const { values, positionals } = parseArgs({
        args: [...argv],
        options: OPTIONS,
        allowPositionals: true,
    });
    if (positionals.length !== 1) throw new Error('要畀一個劇集 folder');
    const folder = folderArg(positionals[0] ?? '');
    if (!existsSync(folder) || !statSync(folder).isDirectory())
        throw new Error(`搵唔到 folder：${folder}`);
    return { folder, ...values };
};

/** 冇 --out 就用 <id>.drama.json（冇 --id 用劇名），喺而家嘅 folder；同 listing 一樣用 NFC 劇名 */
const draftName = (args: Args): string =>
    `${args.id ?? basename(resolve(args.folder)).normalize('NFC')}${DRAFT_EXTENSION}`;
const outputPath = (args: Args): string => resolve(args.out ?? draftName(args));

const isDirectory = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

/** 目的地本身係 folder：叫人喺 folder 後面加檔名（引號包住，有空格都照抄得） */
const fileHint = (option: string, folder: string, fileName: string): string =>
    `要畀檔案路徑，例如 ${option} "${join(folder, fileName)}"`;

/** 路徑上面最近一個真係存在嘅地方（上層係檔案時 existsSync 會因 ENOTDIR 回 false，所以一路行上去） */
export const nearestExisting = (
    path: string,
    {
        exists = existsSync,
        parentOf = dirname,
    }: { exists?: (path: string) => boolean; parentOf?: (path: string) => string } = {},
): string | undefined => {
    let current = path;
    while (!exists(current)) {
        const parent = parentOf(current);
        // 去到頂都唔存在（Windows 冇呢個磁碟 / 網絡 share 連唔到）：dirname('Z:\\') 仲係自己（W-496）
        if (parent === current) return undefined;
        current = parent;
    }
    return current;
};

/** 上層 folder 唔啱：分清楚「其實係檔案」同「未開」（QA O-2） */
const parentProblem = (label: string, path: string): string => {
    const found = nearestExisting(dirname(path));
    if (found !== undefined && !isDirectory(found))
        return `[錯誤] ${label} 路徑入面嘅「${found}」係一個檔案，唔係 folder：${path}\n請檢查路徑有冇打錯（有空格要用引號包住）。`;
    return `[錯誤] ${label} 嘅 folder 唔存在：${dirname(path)}\n請先開好個 folder，或者檢查路徑有冇打錯（有空格要用引號包住）。`;
};

/** 寫得入嗎：POSIX 權限 / 唯讀 mount 擋得到；Windows ACL 唔保證準（最尾寫唔到仲有 EXIT.reportFailed 兜底） */
const canWrite = (path: string): boolean => {
    try {
        accessSync(path, fsConstants.W_OK);
        return true;
    } catch {
        return false;
    }
};

interface Target {
    label: string;
    path: string;
    folderHint: string;
}

export interface CliIo {
    out: (text: string) => void;
    now: () => Date;
    fetch: FetchLike;
    /** 預檢用：個路徑寫唔寫得入（預設 accessSync W_OK） */
    canWrite: (path: string) => boolean;
}

/** 一個要寫嘅檔：上層 folder 要存在、寫得入，本身唔可以係 folder；錯就回傳點改，啱就 undefined */
const destinationProblem = ({ label, path, folderHint }: Target, io: CliIo): string | undefined => {
    const parent = dirname(path);
    if (!isDirectory(parent)) return parentProblem(label, path);
    if (isDirectory(path)) return `[錯誤] ${label} 係一個 folder：${path}\n${folderHint}`;
    // 已經有個檔（--force 覆蓋）睇個檔本身；未有就睇上層 folder 開唔開得新檔
    const target = existsSync(path) ? path : parent;
    if (!io.canWrite(target))
        return `[錯誤] ${label} 冇權限寫入：${target}\n請揀另一個 folder，或者檢查權限 / 係咪唯讀磁碟。`;
    return undefined;
};

/** 輸出 drama.json：有 --out 就叫人喺 folder 後面加 <id>.drama.json；預設名撞 folder 就叫人加 --out 或者搬走（QA O-1） */
const outputTarget = (args: Args): Target => {
    const path = outputPath(args);
    if (args.out !== undefined)
        return {
            label: '輸出檔（--out）',
            path,
            folderHint: fileHint('--out', path, draftName(args)),
        };
    const example = `--out "${OTHER_FOLDER_PLACEHOLDER}/${draftName(args)}"`;
    const folderHint = `請加 --out 揀檔案路徑，例如 ${example}；或者將嗰個 folder 改名 / 搬走。`;
    return { label: '預設輸出檔（冇畀 --out）', path, folderHint };
};

const reportTarget = (report: string): Target => {
    const path = resolve(report);
    return { label: '--report', path, folderHint: fileHint('--report', path, REPORT_EXAMPLE_NAME) };
};

/**
 * 掃 folder 之前驗晒要寫嘅路徑（輸出 drama.json、--report）：
 * 唔係就要等成份報告印完、甚至 drama.json 寫咗先發現（CUI-0008 / S-568）
 */
const checkDestinations = (args: Args, io: CliIo): void => {
    const targets = [outputTarget(args)];
    if (args.report !== undefined) targets.push(reportTarget(args.report));
    const problem = targets.map((target) => destinationProblem(target, io)).find(Boolean);
    if (problem !== undefined) throw new Error(problem);
};

const readExisting = (path: string): unknown => {
    try {
        return JSON.parse(readFileSync(path, 'utf8')) as unknown;
    } catch (error) {
        throw new Error(`讀唔到 --existing ${path}：${(error as Error).message}`, { cause: error });
    }
};

const verifyAll = async (result: DraftResult, args: Args, io: CliIo): Promise<ExitCode> => {
    const audio = result.json?.audio as { host: string; folder: string };
    if (audio.host !== 'r2') {
        io.out('\n--verify：呢套劇唔係放 R2（audio.host 唔係 r2），跳過');
        return EXIT.ok;
    }
    const json = result.json ?? {};
    const urls = [
        ...episodeUrls(json, args.base),
        ...coverUrls(result.scan, audio.folder, args.base),
    ];
    io.out(`\n--verify：HEAD ${urls.length} 條網址…`);
    const failures = await verifyUrls(urls, { fetch: io.fetch });
    failures.forEach((f) =>
        io.out(`  [唔得] ${f.reason}  ${decodeURIComponent(f.url.slice(args.base.length + 1))}`),
    );
    io.out(failures.length === 0 ? '  全部 OK' : `  ${failures.length} 條唔得`);
    return failures.length === 0 ? EXIT.ok : EXIT.verifyFailed;
};

const defaultIo: CliIo = {
    out: (text) => process.stdout.write(`${text}\n`),
    now: () => new Date(),
    fetch: (input, init) => globalThis.fetch(input, init),
    canWrite,
};

/** 輸出檔已存在又冇 --force：回傳點解唔寫（用戶通常冇版本控制，冚咗就冇得返轉頭） */
const overwriteRefusal = (out: string, args: Args): string | undefined => {
    if (args.force || !existsSync(out)) return undefined;
    const isExisting = args.existing !== undefined && resolve(args.existing) === out;
    const what = isExisting ? `${out} 就係 --existing 嗰個檔` : `${out} 已經存在`;
    return `${what}，冇覆蓋（冇寫任何檔）。要覆蓋請加 --force，或者用 --out 揀第二個名。`;
};

/** 生成 → 報告 → 寫檔 → （--verify）；回傳 exit code */
const generateAndWrite = async (args: Args, existing: unknown, io: CliIo): Promise<ExitCode> => {
    const result = draftFromFolder(args.folder, { id: args.id, existing, now: io.now() });
    io.out(formatReport(result, { existing }));
    if (result.json === null) {
        io.out('\n有 [錯誤]，冇寫 drama.json；按上面改好 folder（或者 --existing 嘅檔）再行一次。');
        return EXIT.blocked;
    }
    const out = outputPath(args);
    const refusal = overwriteRefusal(out, args);
    if (refusal !== undefined) {
        io.out(`\n${refusal}`);
        return EXIT.usage;
    }
    writeFileSync(out, `${JSON.stringify(result.json, null, JSON_INDENT)}\n`);
    io.out(`\n已寫入：${out}`);
    return args.verify ? verifyAll(result, args, io) : EXIT.ok;
};

/** 最尾寫唔到報告檔：drama.json 寫咗就講明（唔好令人以為乜都冇寫而重行），回傳最終 exit code */
const reportWriteFailed = (code: ExitCode, args: Args, error: unknown, io: CliIo): ExitCode => {
    const where = `${resolve(args.report ?? '')}（${(error as Error).message}）`;
    if (!DRAFT_WRITTEN_CODES.has(code)) {
        io.out(`\n寫唔到報告檔 ${where}`);
        return code;
    }
    io.out(`\ndrama.json 已經寫好（${outputPath(args)}），只係報告檔寫唔到：${where}`);
    io.out('上面畫面就係成份報告，可以直接複製；唔使重行。');
    return code === EXIT.ok ? EXIT.reportFailed : code;
};

/**
 * --report：輸出照印上畫面，同時收埋；完咗用 UTF-8（冇 BOM，Windows 10 起記事本識讀）寫落檔，
 * 唔經 console code page，報告先唔會變亂碼。冇 --report 就原封不動。
 */
const withReportFile = (io: CliIo, args: Args) => {
    const path = args.report;
    if (path === undefined) return { io, flush: (code: ExitCode) => code };
    const lines: string[] = [];
    const out = (text: string) => {
        lines.push(text);
        io.out(text);
    };
    const flush = (code: ExitCode): ExitCode => {
        try {
            writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
        } catch (error) {
            return reportWriteFailed(code, args, error, io);
        }
        io.out(`報告已寫入：${resolve(path)}`);
        return code;
    };
    return { io: { ...io, out }, flush };
};

/** 預計之外嘅錯誤：同「有 [錯誤]」分開 exit code，印埋技術資料方便跟進 */
const reportInternalError = (error: unknown, io: CliIo): ExitCode => {
    const failure = error as Error | undefined;
    io.out(`\n程式出錯：${failure?.message ?? String(error)}`);
    io.out('呢個唔係 folder 嘅問題；請將成段輸出（連下面嘅技術資料）傳返嚟。');
    if (failure?.stack) io.out(`\n技術資料：\n${failure.stack}`);
    return EXIT.internal;
};

/** 讀 argv + 預檢目的地 + 讀 --existing；錯就印用法，回傳 undefined */
const prepare = (argv: readonly string[], io: CliIo) => {
    try {
        const args = readArgs(argv);
        checkDestinations(args, io);
        // 有畀 --existing 就一定要驗：檔入面係 null 都唔可以當冇畀
        const existing = args.existing === undefined ? undefined : readExisting(args.existing);
        return { args, existing };
    } catch (error) {
        io.out(`${(error as Error).message}\n${USAGE}`);
        return undefined;
    }
};

/** CLI 主流程；回傳 exit code（test 直接 call，唔使開 process） */
export const run = async (argv: readonly string[], overrides: Partial<CliIo> = {}) => {
    const io = { ...defaultIo, ...overrides };
    const prepared = prepare(argv, io);
    if (prepared === undefined) return EXIT.usage;
    const report = withReportFile(io, prepared.args);
    let code: ExitCode;
    try {
        code = await generateAndWrite(prepared.args, prepared.existing, report.io);
    } catch (error) {
        code = reportInternalError(error, report.io);
    }
    return report.flush(code);
};

/** 直接行（tsx）先跑 main；被 import（test）就唔跑 */
const isEntryPoint = (): boolean => {
    const entry = process.argv[1];
    return entry !== undefined && pathToFileURL(realpathSync(entry)).href === import.meta.url;
};

/** process.argv 頭兩個係 node 同 script 路徑 */
const ARGV_OFFSET = 2;

if (isEntryPoint()) {
    // npm run -w apps/player 會將 cwd 轉去 apps/player：相對路徑同預設輸出檔要跟用戶原本嘅 folder
    if (process.env.INIT_CWD) process.chdir(process.env.INIT_CWD);
    process.exitCode = await run(process.argv.slice(ARGV_OFFSET));
}
