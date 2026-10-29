#!/usr/bin/env node
/*
 * dramaFromFolder.mjs：由本機嘅廣播劇 folder（照原樣上載去 Cloudflare R2 嗰份）
 * 生成 903-player 用嘅 drama.json 草稿，同埋一份檢查報告。
 *
 *   node dramaFromFolder.mjs "<劇集 folder>" [--id <id>] [--existing <drama.json>]
 *                            [--out <檔案>] [--force] [--report <檔案>] [--verify]
 *
 * 單一檔案、只用 Node 內置 module（Node 18.3 或以上，建議 20+；parseArgs 18.3 先有），
 * 下載落嚟就行得，唔使 npm install。
 * 規則同 app 一致（src/dramas/schema.ts、filename.ts、episodes.ts）；app 規則一改，呢度要跟住改，
 * scripts/dramaFromFolder.test.ts 會將輸出餵畀 app 真正嘅 validator 驗。
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

/** 同 src/config/constants.ts 嘅 DRAMA_AUDIO_BASE 一樣（test 會核對） */
export const DRAMA_AUDIO_BASE = 'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev';

/** 短篇劇檔名 template：第一個係常見寫法；第二個係檔名入面短篇名前面加埋劇名（黃金少年） */
export const SERIES_TEMPLATES = [
    '{no2} - {arc} - 第{noZh}集[ - {title}].m4a',
    '{no2} - {folder}{arc} - 第{noZh}集[ - {title}].m4a',
];
export const DAILY_TEMPLATE = '{yyyymmdd}.m4a';

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
});
/** 呢啲 exit code 代表 drama.json 已經寫咗（報告檔寫唔到時要講清楚） */
const DRAFT_WRITTEN_CODES = new Set([EXIT.ok, EXIT.verifyFailed]);

const AUDIO_EXTENSIONS = new Set(['.m4a', '.mp3', '.aac', '.mp4']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
/** 系統自動生成嘅檔（macOS / Windows），一律略過 */
const SYSTEM_FILES = new Set(['thumbs.db', 'desktop.ini']);
/** 見過嘅封面檔名：cover photo.png / cover photo.jpg / cover-photo.jpg */
const STANDARD_COVER = /^cover[ -]photo\.(jpe?g|png)$/i;
/** 「NN - 短篇 - 第N集[ - 集名]」（短篇名本身可以有「 - 」，所以用 lazy） */
const EPISODE_PATTERN = /^(\d+) - (.+?) - 第([^集]+)集(?: - (.+))?$/s;
const DAILY_PATTERN = /^(\d{4})(\d{2})(\d{2})$/;
/** app 嘅 folder id：細楷英數同連字號 */
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const FILE_NO_WIDTH = 2;
/** 短篇正常由第 0 集（前傳）或者第 1 集開始 */
const USUAL_FIRST_NOS = new Set([0, 1]);
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
const HEX_WIDTH = 4;
const HEX_RADIX = 16;
/** 新劇未有設計色調：先用 app 嘅中性色（NEUTRAL_THEME），上架前要按封面改 */
const PLACEHOLDER_THEME = Object.freeze({
    bg: '#141414',
    surface: '#1e1e1e',
    track: '#333333',
    accent: '#f2f2f2',
    onAccent: '#141414',
    title: '#ffffff',
    text: '#f2f2f2',
    muted: '#a3a3a3',
    shadowDark: '#0a0a0a',
    shadowLight: '#242424',
});
/** --existing 時，短篇入面人手寫嘅欄位照留 */
const HAND_WRITTEN_ARC_KEYS = ['disc', 'tile', 'addedAt'];

/* ───────────── 檔名工具（同 src/dramas/filename.ts 一樣） ───────────── */

const CHINESE_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const CHINESE_ZERO = '零';
const CHINESE_TEN = '十';
const TEN = 10;
const MAX_CHINESE_NUMERAL = 99;

/** 0–99 → 中文數字（0 →「零」、10 →「十」、12 →「十二」、36 →「三十六」） */
export const toChineseNumeral = (n) => {
    if (n === 0) return CHINESE_ZERO;
    const tens = Math.floor(n / TEN);
    const ones = n % TEN;
    if (tens === 0) return CHINESE_DIGITS[ones] ?? String(n);
    const tensPart = tens === 1 ? CHINESE_TEN : `${CHINESE_DIGITS[tens] ?? ''}${CHINESE_TEN}`;
    return `${tensPart}${CHINESE_DIGITS[ones] ?? ''}`;
};

const NUMERAL_LOOKUP = new Map(
    Array.from({ length: MAX_CHINESE_NUMERAL + 1 }, (_, n) => [toChineseNumeral(n), n]),
);

/** 「第X集」入面嘅 X → 數字（中文數字或者阿拉伯數字）；讀唔到就 undefined */
export const parseEpisodeNumeral = (text) =>
    /^\d+$/.test(text) ? Number(text) : NUMERAL_LOOKUP.get(text);

const TOKEN_PATTERN = /\{(\w+)\}/g;
const GROUP_OR_TOKEN_PATTERN = /\[([^\]]*)\]|\{(\w+)\}/g;

const lookupToken = (tokens, name) => {
    const value = tokens[name];
    if (value === undefined) throw new Error(`unknown token {${name}}`);
    return value;
};

const renderGroup = (group, tokens) => {
    let dropped = false;
    const rendered = group.replace(TOKEN_PATTERN, (_, name) => {
        const value = lookupToken(tokens, name);
        if (value === '') dropped = true;
        return value;
    });
    return dropped ? '' : rendered;
};

/** `{token}` 換值，`[ … ]` 入面 token 空值就略去成段 */
export const renderFileName = (template, tokens) =>
    template.replace(GROUP_OR_TOKEN_PATTERN, (_, group, name) =>
        group === undefined ? lookupToken(tokens, name) : renderGroup(group, tokens),
    );

const seriesTokens = (folder, arc, no, title) => ({
    no: String(no),
    no2: String(no).padStart(FILE_NO_WIDTH, '0'),
    noZh: toChineseNumeral(no),
    arc,
    folder,
    title,
});

const dailyTokens = (folder, date) => ({ date, yyyymmdd: date.replaceAll('-', ''), folder });

/** 每段 encode（空格、中文、全形字），同 app 一樣 */
export const encodePath = (segments) => segments.map(encodeURIComponent).join('/');

/* ───────────── 名稱檢查 ───────────── */

const uPlus = (ch) =>
    `U+${(ch.codePointAt(0) ?? 0).toString(HEX_RADIX).toUpperCase().padStart(HEX_WIDTH, '0')}`;

/**
 * 全形英數（０–９、Ａ–Ｚ、ａ–ｚ）：同半形睇落一樣但 byte 唔同，先係陷阱。
 * 中文全形標點（？！，：（））係正常寫法，R2 key 就係咁，唔報；亦唔可以叫用戶改半形：
 * Windows 檔名唔准「?」，改名要重新上載，網址一變已儲進度（localStorage key）就冇。
 */
const FULL_WIDTH_ALPHANUMERIC = /[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]/u;

/** [regex, 描述]：全部係「睇落一樣但係 byte 唔同」嘅陷阱 */
const CHARACTER_TRAPS = [
    [
        /[\u2160-\u2188]/u,
        (ch) => `羅馬數字「${ch}」(${uPlus(ch)})，ASCII 寫法係「${ch.normalize('NFKC')}」`,
    ],
    [
        FULL_WIDTH_ALPHANUMERIC,
        (ch) =>
            `全形英數「${ch}」(${uPlus(ch)})，同半形「${ch.normalize('NFKC')}」睇落一樣但 byte 唔同；確認 R2 上面都係全形`,
    ],
    [/\u3000/u, (ch) => `有全形空格 (${uPlus(ch)})`],
    [/[\u200b-\u200d\u2060\ufeff]/u, (ch) => `有隱形字元 (${uPlus(ch)})`],
];

/** 一個名有咩可疑之處（冇就空 array） */
export const findSuspicious = (name) => {
    const found = CHARACTER_TRAPS.flatMap(([pattern, describe]) => {
        const match = pattern.exec(name);
        return match ? [describe(match[0])] : [];
    });
    if (name !== name.normalize('NFC'))
        found.push(
            'Unicode 係 NFD 分解形式（macOS 常見）；drama.json 會用 NFC，上載後請用 --verify 確認',
        );
    if (/^\s|\s$/u.test(name)) found.push('頭尾有空格');
    if (/ {2,}/.test(name)) found.push('有連續空格');
    return found;
};

/* ───────────── 讀 folder ───────────── */

const issue = (level, where, message) => ({ level, where, message });

/** R2 listing 係 UTF-8 byte 次序 */
const byteOrder = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));

const extensionOf = (name) => {
    const dot = name.lastIndexOf('.');
    return dot <= 0 ? '' : name.slice(dot).toLowerCase();
};

const classify = (entry) => {
    const lower = entry.name.toLowerCase();
    if (entry.name.startsWith('.') || SYSTEM_FILES.has(lower)) return 'ignored';
    if (entry.isDirectory()) return 'dirs';
    if (AUDIO_EXTENSIONS.has(extensionOf(lower))) return 'audio';
    return IMAGE_EXTENSIONS.has(extensionOf(lower)) ? 'images' : 'ignored';
};

/** 一層 folder 分類（原始檔名，未 normalise），每類按 byte 次序 */
const listFolder = (dir) => {
    const groups = { dirs: [], audio: [], images: [], ignored: [] };
    readdirSync(dir, { withFileTypes: true }).forEach((entry) =>
        groups[classify(entry)].push(entry.name),
    );
    Object.values(groups).forEach((names) => names.sort(byteOrder));
    return groups;
};

const scanArc = (dir, rawName) => {
    const { dirs, audio, images, ignored } = listFolder(dir);
    return {
        rawName,
        name: rawName.normalize('NFC'),
        audio,
        covers: images,
        ignored: [...ignored, ...dirs.map((d) => `${d}/`)].sort(byteOrder),
    };
};

/** 讀成個劇集 folder：劇集層封面 / 錄音 / 略過檔，同每個短篇 folder */
export const scanDramaFolder = (root) => {
    const rawName = basename(resolve(root));
    const { dirs, audio, images, ignored } = listFolder(root);
    const arcs = dirs.map((d) => scanArc(join(root, d), d));
    arcs.sort((a, b) => byteOrder(a.name, b.name));
    return { rawName, name: rawName.normalize('NFC'), audio, covers: images, ignored, arcs };
};

/* ───────────── 短篇劇 ───────────── */

/** 「NN - 短篇 - 第N集[ - 集名].m4a」→ 各部分；唔符合就 null */
export const parseEpisodeFileName = (rawFile) => {
    const file = rawFile.normalize('NFC');
    const ext = extensionOf(file);
    const match = EPISODE_PATTERN.exec(file.slice(0, file.length - ext.length));
    if (!match) return null;
    const [, digits, label, numeral, title] = match;
    return {
        file,
        no: Number(digits),
        zhNo: parseEpisodeNumeral(numeral),
        label,
        title: title ?? '',
        ext,
    };
};

const nameIssues = (where, rawName) =>
    findSuspicious(rawName).map((message) => issue('warn', where, `「${rawName}」${message}`));

/** 檔名 → 集；讀唔到 / 集數對唔上嘅記低錯誤 */
const parseArcFiles = (arc, issues) =>
    arc.audio.flatMap((file) => {
        const parsed = parseEpisodeFileName(file);
        if (!parsed) {
            issues.push(
                issue('error', arc.name, `檔名唔符合「NN - 短篇 - 第N集[ - 集名]」：${file}`),
            );
            return [];
        }
        if (parsed.zhNo !== parsed.no) {
            issues.push(issue('error', arc.name, `集數 ${parsed.no} 同「第X集」對唔上：${file}`));
            return [];
        }
        return [parsed];
    });

/** 一個名有幾多種可疑之處就報幾多次（同一種只報第一個例子），唔好洗版 */
const fileNameIssues = (arc) => {
    const seen = new Map();
    arc.audio.forEach((file) =>
        findSuspicious(file).forEach((message) => {
            const kind = message.replace(/「.*?」|\(U\+[0-9A-F]+\)/g, '');
            if (!seen.has(kind))
                seen.set(kind, issue('warn', arc.name, `檔名「${file}」${message}`));
        }),
    );
    return [...seen.values()];
};

/** 重複 / 跳號（schema 要求 firstNo 起連續） */
const numberingIssues = (arc, episodes) => {
    const counts = new Map();
    episodes.forEach((e) => counts.set(e.no, (counts.get(e.no) ?? 0) + 1));
    const issues = [...counts]
        .filter(([, n]) => n > 1)
        .map(([no, n]) => issue('error', arc.name, `第 ${no} 集有 ${n} 個檔`));
    const nos = [...counts.keys()];
    if (nos.length === 0) return [issue('error', arc.name, '冇錄音檔')];
    const missing = rangeOf(Math.min(...nos), Math.max(...nos)).filter((n) => !counts.has(n));
    if (missing.length > 0) issues.push(issue('error', arc.name, `缺第 ${missing.join('、')} 集`));
    const first = Math.min(...nos);
    // 唔當錯誤：將來可能真係有由第 N 集開始嘅劇；但現有資料全部由 0 / 1 開始，多數係漏咗上載
    if (!USUAL_FIRST_NOS.has(first))
        issues.push(
            issue('warn', arc.name, `由第 ${first} 集開始；確認係咪漏咗上載第 1 集（或者第 0 集）`),
        );
    return issues;
};

const rangeOf = (first, last) => Array.from({ length: last - first + 1 }, (_, i) => first + i);

/** 讀短篇：解析檔名 + 所有檢查（未揀 template） */
const readSeriesArc = (arc) => {
    const issues = nameIssues(arc.name, arc.rawName);
    const episodes = parseArcFiles(arc, issues);
    issues.push(...fileNameIssues(arc), ...numberingIssues(arc, episodes));
    episodes.sort((a, b) => a.no - b.no);
    return { arc, episodes, issues };
};

const renderEpisode = (template, folder, arcName, e) =>
    renderFileName(template, seriesTokens(folder, arcName, e.no, e.title));

/** 揀最多檔名完全對得上嘅 template（打和用第一個） */
const chooseTemplate = (folder, readArcs) => {
    const score = (template) =>
        readArcs.reduce(
            (sum, { arc, episodes }) =>
                sum +
                episodes.filter((e) => renderEpisode(template, folder, arc.name, e) === e.file)
                    .length,
            0,
        );
    return SERIES_TEMPLATES.reduce((best, t) => (score(t) > score(best) ? t : best));
};

/** 全部有集名 → 集名 list；部份有 → 集數 + titles；template 砌唔返嘅檔 → files */
const episodeFields = (template, folder, arcName, episodes) => {
    const firstNo = episodes[0]?.no ?? 1;
    const count = episodes.length;
    const titled = episodes.filter((e) => e.title !== '');
    const files = episodes.filter((e) => renderEpisode(template, folder, arcName, e) !== e.file);
    const all = titled.length === count;
    return {
        ...(firstNo === 1 ? {} : { firstNo }),
        episodes: all ? episodes.map((e) => e.title) : count,
        ...(!all && titled.length > 0 ? { titles: mapOf(titled, (e) => e.title) } : {}),
        ...(files.length > 0 ? { files: mapOf(files, (e) => e.file) } : {}),
    };
};

const mapOf = (episodes, valueOf) => Object.fromEntries(episodes.map((e) => [e.no, valueOf(e)]));

/** 檔名入面嘅短篇名同 template 預期唔同（例如 folder 用 II、檔名用 Ⅱ） */
const labelIssues = (template, folder, { arc, episodes }) => {
    const expected = template.includes('{folder}{arc}') ? `${folder}${arc.name}` : arc.name;
    const labels = [...new Set(episodes.map((e) => e.label))].filter((l) => l !== expected);
    return labels.map((label) => {
        const sameLooking = label.normalize('NFKC') === expected.normalize('NFKC');
        const hint = sameLooking ? '（睇落一樣，只係 Unicode 寫法唔同）' : '';
        return issue(
            'warn',
            arc.name,
            `檔名入面嘅短篇名「${label}」同 folder「${expected}」唔一樣${hint}`,
        );
    });
};

const overrideIssue = (arcName, fields) => {
    const files = Object.values(fields.files ?? {});
    if (files.length === 0) return [];
    const example = files[0];
    return [
        issue(
            'warn',
            arcName,
            `${files.length} 集檔名唔跟 template，已用 files 逐集寫明（例如「${example}」）`,
        ),
    ];
};

const summaryOf = ({ arc, episodes }) => ({
    name: arc.name,
    count: episodes.length,
    first: episodes[0]?.no,
    last: episodes.at(-1)?.no,
    titled: episodes.filter((e) => e.title !== '').length,
    covers: arc.covers,
    ignored: arc.ignored,
});

/** 讀晒每個短篇 → 揀 template → 砌 arcs */
const analyseSeries = (scan, template) => {
    const read = scan.arcs.map(readSeriesArc);
    const chosen = template ?? chooseTemplate(scan.name, read);
    const issues = read.flatMap((r) => [...r.issues, ...labelIssues(chosen, scan.name, r)]);
    const arcs = read.map(({ arc, episodes }) => {
        const fields = episodeFields(chosen, scan.name, arc.name, episodes);
        issues.push(...overrideIssue(arc.name, fields));
        return { name: arc.name, ...fields };
    });
    return { template: chosen, arcs, issues, summaries: read.map(summaryOf) };
};

/* ───────────── 每日劇 ───────────── */

const isCalendarDate = (y, m, d) => {
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return (
        date.getUTCFullYear() === Number(y) &&
        date.getUTCMonth() === Number(m) - 1 &&
        date.getUTCDate() === Number(d)
    );
};

/** YYYYMMDD.m4a → YYYY-MM-DD；唔係就 undefined */
const dailyDateOf = (rawFile) => {
    const file = rawFile.normalize('NFC');
    const ext = extensionOf(file);
    const match = DAILY_PATTERN.exec(file.slice(0, file.length - ext.length));
    if (!match || ext !== '.m4a' || !isCalendarDate(match[1], match[2], match[3])) return undefined;
    return `${match[1]}-${match[2]}-${match[3]}`;
};

/** 每日劇：劇集 folder 直接放 YYYYMMDD.m4a，新到舊排（同 c18 一樣） */
const analyseDaily = (scan) => {
    const issues = [];
    const dates = scan.audio.flatMap((file) => {
        const date = dailyDateOf(file);
        if (date === undefined)
            issues.push(issue('error', scan.name, `每日劇檔名要係 YYYYMMDD.m4a：${file}`));
        return date === undefined ? [] : [date];
    });
    dates.sort().reverse();
    const summaries = [
        { name: scan.name, count: dates.length, first: dates.at(-1), last: dates[0] },
    ];
    return { template: DAILY_TEMPLATE, dates, issues, summaries };
};

/* ───────────── 砌 drama.json ───────────── */

/**
 * 香港日期 YYYY-MM-DD。用 formatToParts 逐部份砌：唔靠某個 locale 嘅格式
 * （例如 en-CA 剛好係 YYYY-MM-DD，但 small-icu 嘅 Node 會退返 en-US 出 10/29/2026）。
 */
export const todayInHongKong = (now) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: HONG_KONG_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const part = (type) => parts.find((p) => p.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
};

const newDramaBase = (scan, kind, template) => ({
    name: scan.name,
    kind,
    enabled: false,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: { host: 'r2', folder: scan.name, file: template },
    theme: { ...PLACEHOLDER_THEME },
});

const episodeCountOf = (arc) => (Array.isArray(arc.episodes) ? arc.episodes.length : arc.episodes);

const pickHandWritten = (old) =>
    Object.fromEntries(
        HAND_WRITTEN_ARC_KEYS.filter((k) => old[k] !== undefined).map((k) => [k, old[k]]),
    );

const firstNoOf = (arc) => arc.firstNo ?? 1;

/** 一個短篇每集嘅集名（episodes list 同 titles 合埋，titles 優先；null = 冇集名） */
const titlesOf = (arc) => {
    const list = Array.isArray(arc.episodes) ? arc.episodes : [];
    const titles = new Map(
        list.flatMap((t, i) => (typeof t === 'string' ? [[firstNoOf(arc) + i, t]] : [])),
    );
    Object.entries(arc.titles ?? {}).forEach(([no, t]) => titles.set(Number(no), t));
    return titles;
};

const filesOf = (arc) => new Map(Object.entries(arc.files ?? {}).map(([no, f]) => [Number(no), f]));

/** 兩個 集數 → 值 map 有邊幾集唔同 */
const changedNos = (before, after) =>
    [...new Set([...before.keys(), ...after.keys()])]
        .filter((no) => before.get(no) !== after.get(no))
        .sort((a, b) => a - b);

/** 舊 drama.json 有、檔名冇嘅集名（人手補嘅），只計 folder 而家有嘅集數 */
const handOnlyTitles = (old, fresh) => {
    const folderTitles = titlesOf(fresh);
    const last = firstNoOf(fresh) + episodeCountOf(fresh) - 1;
    return [...titlesOf(old)].filter(
        ([no, title]) =>
            title !== '' && no >= firstNoOf(fresh) && no <= last && !folderTitles.has(no),
    );
};

/** 由 集數 → 集名 map 砌返 episodes / titles（全部有集名就用 list，同 episodeFields 一樣） */
const episodeShape = (fresh, titles, files) => {
    const [first, count] = [firstNoOf(fresh), episodeCountOf(fresh)];
    const all = titles.size === count;
    const sorted = (map) => Object.fromEntries([...map].sort(([a], [b]) => a - b));
    return {
        ...(first === 1 ? {} : { firstNo: first }),
        episodes: all ? rangeOf(first, first + count - 1).map((no) => titles.get(no)) : count,
        ...(!all && titles.size > 0 ? { titles: sorted(titles) } : {}),
        ...(files.size > 0 ? { files: sorted(files) } : {}),
    };
};

/**
 * 人手補嘅集名（檔名冇）照留：template 有 {title} 嘅話加埋集名會砌錯檔名，
 * 所以嗰集用 files 寫明真檔名，網址先唔會變。
 */
const keepHandTitles = (old, fresh, ctx, issues) => {
    const kept = handOnlyTitles(old, fresh);
    if (kept.length === 0) return fresh;
    const [titles, files] = [titlesOf(fresh), filesOf(fresh)];
    kept.forEach(([no, title]) => {
        const file = arcEpisodeFile(ctx, fresh, no);
        titles.set(no, title);
        if (
            renderFileName(
                ctx.audio.file,
                seriesTokens(ctx.audio.folder, fresh.name, no, title),
            ) !== file
        )
            files.set(no, file);
        const message = `第 ${no} 集嘅集名「${title}」檔名冇，係人手加嘅；已保留（用 files 寫明真檔名，網址唔變）`;
        issues.push(issue('warn', fresh.name, message));
    });
    return { name: fresh.name, ...episodeShape(fresh, titles, files) };
};

/** 集數、第幾集開始、集名、files 有變就講一聲（以 folder 為準，但唔好靜靜雞改） */
const arcChangeIssues = (old, merged) => {
    const where = merged.name;
    const changes = [];
    const [before, after] = [episodeCountOf(old), episodeCountOf(merged)];
    if (before !== after) changes.push(`集數由 ${before} 變 ${after}`);
    if (firstNoOf(old) !== firstNoOf(merged))
        changes.push(`由第 ${firstNoOf(old)} 集開始變第 ${firstNoOf(merged)} 集開始`);
    const titles = changedNos(titlesOf(old), titlesOf(merged));
    if (titles.length > 0) changes.push(`集名有變（第 ${titles.join('、')} 集）`);
    const files = changedNos(filesOf(old), filesOf(merged));
    if (files.length > 0) changes.push(`files 有變（第 ${files.join('、')} 集）`);
    return changes.map((message) => issue('info', where, message));
};

/** 舊短篇：人手欄位（同人手補嘅集名）照留，集數部份用 folder 嘅 */
const mergeArc = (old, fresh, ctx, issues) => {
    const { name, ...episodePart } = keepHandTitles(old, fresh, ctx, issues);
    const merged = { name: old.name, ...pickHandWritten(old), ...episodePart };
    issues.push(...arcChangeIssues(old, merged));
    return merged;
};

/**
 * --existing：舊短篇照原次序，folder 冇嘅保留兼提示；新短篇加喺尾，addedAt = 今日。
 * ctx：{ audio: { file, folder }（砌檔名用）, today }
 */
const mergeArcs = (oldArcs, freshArcs, ctx, issues) => {
    const fresh = new Map(freshArcs.map((a) => [a.name, a]));
    const kept = oldArcs.map((old) => {
        const match = fresh.get(old.name);
        if (!match) {
            issues.push(
                issue(
                    'warn',
                    old.name,
                    '本機 folder 冇呢個短篇；已保留原設定，如果真係落咗架請手動刪',
                ),
            );
            return old;
        }
        fresh.delete(old.name);
        return mergeArc(old, match, ctx, issues);
    });
    const added = [...fresh.values()].map(({ name, ...rest }) => {
        issues.push(issue('info', name, `新短篇，addedAt = ${ctx.today}`));
        return { name, addedAt: ctx.today, ...rest };
    });
    return [...kept, ...added];
};

/** 每日劇 --existing：舊集嘅 rerun / file 照留，folder 冇嘅保留兼提示 */
const mergeDaily = (oldEpisodes, dates, issues) => {
    const old = new Map(oldEpisodes.map((e) => [e.date, e]));
    const missing = oldEpisodes.filter((e) => !dates.includes(e.date));
    missing.forEach((e) => issues.push(issue('warn', e.date, '本機 folder 冇呢日；已保留')));
    const merged = [...dates.map((date) => old.get(date) ?? { date }), ...missing];
    return merged.sort((a, b) => b.date.localeCompare(a.date));
};

/* ───────────── 驗 --existing 形狀 ───────────── */

const isPlainObject = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

/** 試砌一次 template 用嘅樣本日期（每日劇 token 要有日期先砌得） */
const SAMPLE_DATE = '2000-01-01';

/** 試砌一次 audio.file：打錯 token 會 throw，要喺真正用之前轉做訊息 */
const templateProblem = (template, kind) => {
    if (typeof template !== 'string') return '冇 audio.file（檔名 template）';
    const tokens = kind === 'series' ? seriesTokens('', '', 1, '') : dailyTokens('', SAMPLE_DATE);
    try {
        renderFileName(template, tokens);
        return undefined;
    } catch (error) {
        return `audio.file「${template}」有問題：${error.message}`;
    }
};

/** 每種劇嘅 list 欄位，同每項一定要有嘅識別欄位 */
const LIST_SHAPE = { series: ['arcs', 'name'], daily: ['episodes', 'date'] };

const listProblem = (existing, kind) => {
    const [listKey, idKey] = LIST_SHAPE[kind];
    const list = existing[listKey];
    if (list === undefined) return undefined;
    if (!Array.isArray(list)) return `${listKey} 唔係 list（要係 [ … ]）`;
    const bad = list.findIndex((item) => !isPlainObject(item) || typeof item[idKey] !== 'string');
    return bad === -1 ? undefined : `${listKey} 第 ${bad + 1} 項唔係 { "${idKey}": … }`;
};

/** --existing 唔啱用（唔係 object、kind 唔夾、list / template 壞咗）就回傳原因 */
const existingProblem = (existing, kind) => {
    if (!isPlainObject(existing)) return '--existing 唔係 drama.json（要係一個 { … } object）';
    if (existing.kind !== kind)
        return `--existing 係 ${existing.kind ?? '（冇 kind）'}，但 folder 睇落係 ${kind}`;
    const problem = listProblem(existing, kind) ?? templateProblem(existing.audio?.file, kind);
    return problem === undefined ? undefined : `--existing 嘅 ${problem}`;
};

const checkExisting = (scan, existing, issues) => {
    const folder = existing.audio?.folder;
    if (existing.audio?.host === 'r2' && folder !== scan.name)
        issues.push(
            issue(
                'warn',
                scan.name,
                `--existing 嘅 audio.folder「${folder}」同本機 folder 名唔一樣`,
            ),
        );
};

const seriesJson = (scan, existing, today) => {
    const analysis = analyseSeries(scan, existing?.audio?.file);
    if (!existing) {
        const json = {
            ...newDramaBase(scan, 'series', analysis.template),
            addedAt: today,
            arcs: analysis.arcs,
        };
        return { ...analysis, json };
    }
    checkExisting(scan, existing, analysis.issues);
    const ctx = { audio: { file: analysis.template, folder: scan.name }, today };
    const arcs = mergeArcs(existing.arcs ?? [], analysis.arcs, ctx, analysis.issues);
    return { ...analysis, json: { ...existing, arcs } };
};

const dailyJson = (scan, existing) => {
    const analysis = analyseDaily(scan);
    if (!existing) {
        const episodes = analysis.dates.map((date) => ({ date }));
        return { ...analysis, json: { ...newDramaBase(scan, 'daily', DAILY_TEMPLATE), episodes } };
    }
    checkExisting(scan, existing, analysis.issues);
    const episodes = mergeDaily(existing.episodes ?? [], analysis.dates, analysis.issues);
    return { ...analysis, json: { ...existing, episodes } };
};

/** 劇集層嘅檢查：folder 名、亂放嘅錄音、id */
const dramaIssues = (scan, id, kind) => {
    const issues = nameIssues(scan.name, scan.rawName);
    if (kind === 'series')
        scan.audio.forEach((file) =>
            issues.push(
                issue('warn', scan.name, `劇集層有錄音檔（已略過，應該放入短篇 folder）：${file}`),
            ),
        );
    if (kind === 'none')
        issues.push(issue('error', scan.name, '搵唔到短篇 folder，亦冇每日劇錄音'));
    if (id !== undefined && !ID_PATTERN.test(id))
        issues.push(issue('warn', scan.name, `--id「${id}」唔合 app 規則（細楷英數同連字號）`));
    return issues;
};

const kindOf = (scan) =>
    scan.arcs.length > 0 ? 'series' : scan.audio.length > 0 ? 'daily' : 'none';

/**
 * 讀 folder → drama.json 草稿 + 問題清單。有 error 嘅話 json 係 null（唔好寫檔）。
 * options：{ id?, existing?（舊 drama.json object）, now: Date }
 */
export const generateDraft = (root, { id, existing, now }) => {
    const scan = scanDramaFolder(root);
    const kind = kindOf(scan);
    const today = todayInHongKong(now);
    const base = { scan, kind, today, issues: dramaIssues(scan, id, kind) };
    if (kind === 'none') return { ...base, json: null, summaries: [] };
    // 壞 / 唔夾嘅 --existing 要喺用之前停，唔好砌到一半 throw
    const problem = existing === undefined ? undefined : existingProblem(existing, kind);
    if (problem !== undefined) {
        const issues = [...base.issues, issue('error', scan.name, problem)];
        return { ...base, issues, json: null, summaries: [] };
    }
    const built = kind === 'series' ? seriesJson(scan, existing, today) : dailyJson(scan, existing);
    const issues = [...base.issues, ...built.issues];
    const blocked = issues.some((i) => i.level === 'error');
    return { ...base, ...built, issues, json: blocked ? null : orderKeys(built.json) };
};

/** 頂層欄位用固定次序（同手寫 drama.json 一致），undefined 嘅略去 */
const TOP_LEVEL_ORDER = [
    'name',
    'kind',
    'enabled',
    'order',
    'arcUnit',
    'addedAt',
    'tile',
    'disc',
    'audio',
    'theme',
    'arcs',
    'episodes',
];

const orderKeys = (json) => {
    const known = TOP_LEVEL_ORDER.filter((k) => json[k] !== undefined).map((k) => [k, json[k]]);
    const extra = Object.entries(json).filter(
        ([k, v]) => !TOP_LEVEL_ORDER.includes(k) && v !== undefined,
    );
    return Object.fromEntries([...known, ...extra]);
};

/* ───────────── 網址 ───────────── */

const audioBaseOf = (json, base) => `${base}/${encodeURIComponent(json.audio.folder)}`;

const arcEpisodeFile = (json, arc, no) => {
    const listTitle = Array.isArray(arc.episodes)
        ? arc.episodes[no - (arc.firstNo ?? 1)]
        : undefined;
    const title = arc.titles?.[no] ?? listTitle ?? '';
    return (
        arc.files?.[no] ??
        renderFileName(json.audio.file, seriesTokens(json.audio.folder, arc.name, no, title))
    );
};

/** 由 drama.json 砌錄音網址（同 app 嘅 episodes.ts 一樣次序同寫法） */
export const episodeUrls = (json, base = DRAMA_AUDIO_BASE) => {
    const prefix = audioBaseOf(json, base);
    if (json.kind === 'daily')
        return json.episodes.map(
            ({ date, file }) =>
                `${prefix}/${encodeURIComponent(file ?? renderFileName(json.audio.file, dailyTokens(json.audio.folder, date)))}`,
        );
    return json.arcs.flatMap((arc) =>
        rangeOf(arc.firstNo ?? 1, (arc.firstNo ?? 1) + episodeCountOf(arc) - 1).map(
            (no) => `${prefix}/${encodePath([arc.name, arcEpisodeFile(json, arc, no)])}`,
        ),
    );
};

/** 封面網址：劇集層 + 每個短篇 folder 入面搵到嘅圖 */
export const coverUrls = (scan, folder, base = DRAMA_AUDIO_BASE) => [
    ...scan.covers.map((c) => `${base}/${encodePath([folder, c.normalize('NFC')])}`),
    ...scan.arcs.flatMap((arc) =>
        arc.covers.map((c) => `${base}/${encodePath([folder, arc.name, c.normalize('NFC')])}`),
    ),
];

/* ───────────── --verify ───────────── */

/** 一次 HEAD：OK 就 null；唔得就 { url, reason, retryable }（429 / 5xx / 逾時值得再試） */
const headOnce = async (url, fetchImpl, timeoutMs) => {
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
        const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
        const reason = timedOut ? `逾時（${timeoutMs}ms）` : `連線失敗：${error?.message ?? error}`;
        return { url, reason, retryable: timedOut };
    }
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** 暫時性失敗（429 / 5xx / 逾時）等一陣再試一次；404 之類即刻當唔得 */
const headWithRetry = async (url, fetchImpl, { timeoutMs, retryDelayMs }) => {
    const first = await headOnce(url, fetchImpl, timeoutMs);
    if (first === null || !first.retryable) return first && { url, reason: first.reason };
    await sleep(retryDelayMs);
    const second = await headOnce(url, fetchImpl, timeoutMs);
    return second && { url, reason: `${second.reason}（再試一次都唔得）` };
};

/** HEAD 每條網址（限同時幾多條 + timeout + 暫時性失敗再試一次），回傳唔得嘅（跟原本次序） */
export const verifyUrls = async (urls, options = {}) => {
    const {
        concurrency = VERIFY_CONCURRENCY,
        timeoutMs = VERIFY_TIMEOUT_MS,
        retryDelayMs = VERIFY_RETRY_DELAY_MS,
    } = options;
    const fetchImpl = options.fetch ?? globalThis.fetch;
    const results = new Array(urls.length).fill(null);
    let next = 0;
    const worker = async () => {
        while (next < urls.length) {
            const index = next++;
            results[index] = await headWithRetry(urls[index], fetchImpl, {
                timeoutMs,
                retryDelayMs,
            });
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
    return results.filter(Boolean);
};

/* ───────────── 報告 ───────────── */

const LEVEL_LABELS = { error: '[錯誤]', warn: '[注意]', info: '[資料]' };

const rangeText = (s) => (s.first === s.last ? `第 ${s.first} 集` : `第 ${s.first}–${s.last} 集`);

const arcLine = (s, i) => {
    const titled = s.titled > 0 ? `，${s.titled} 集有集名` : '';
    const covers = s.covers.length > 0 ? `；封面：${s.covers.join('、')}` : '；冇封面';
    const nonStandard = s.covers.filter((c) => !STANDARD_COVER.test(c.normalize('NFC')));
    const odd = nonStandard.length > 0 ? `（唔常見嘅封面檔名：${nonStandard.join('、')}）` : '';
    const counted = s.count > 0 ? `${s.count} 集（${rangeText(s)}）${titled}` : '冇錄音';
    return `  ${i + 1}. ${s.name}：${counted}${covers}${odd}`;
};

const dailyLine = (s) => `  每日劇：${s.count} 集（${s.first ?? '-'} 至 ${s.last ?? '-'}）`;

const ignoredLines = (scan) => {
    const top = scan.ignored.map((f) => `  ${f}`);
    const arcs = scan.arcs.flatMap((a) => a.ignored.map((f) => `  ${a.name}/${f}`));
    const lines = [...top, ...arcs];
    return lines.length > 0 ? ['', `已略過嘅檔案（${lines.length} 個）：`, ...lines] : [];
};

const issueLines = (issues) => {
    if (issues.length === 0) return ['', '問題：冇'];
    const ordered = ['error', 'warn', 'info'].flatMap((level) =>
        issues.filter((i) => i.level === level),
    );
    return [
        '',
        '問題：',
        ...ordered.map((i) => `  ${LEVEL_LABELS[i.level]} ${i.where}：${i.message}`),
    ];
};

const nextStepLines = (result, existing) => {
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
export const formatReport = (result, { existing } = {}) => {
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

export const USAGE = `用法：node dramaFromFolder.mjs "<劇集 folder>" [--id <id>] [--existing <drama.json>] [--out <檔案>] [--force] [--report <檔案>] [--verify]`;

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
};

/** 路徑尾嘅 / 或者 \（Windows 用 \，macOS 拖 folder 入 Terminal 有時會加 /）；根目錄（/、C:\）唔郁 */
const TRAILING_SEPARATORS = /(?<=[^:\\/])[\\/]+$/;

/**
 * Windows 用雙引號包住路徑而尾有 \（"D:\劇\"）：\" 會變做字面嘅 "，後面嘅參數仲會黐埋落嚟，
 * 所以路徑有 " 就直接講點改；冇嘅話食走尾嘅分隔符。
 */
const folderArg = (raw) => {
    if (raw.includes('"'))
        throw new Error(
            `路徑入面有「"」：${raw}\n用雙引號包住路徑嗰陣，路徑尾唔好加 \\（例如 "D:\\劇\\黃金少年"）`,
        );
    return raw.replace(TRAILING_SEPARATORS, '');
};

const readArgs = (argv) => {
    const { values, positionals } = parseArgs({
        args: argv,
        options: OPTIONS,
        allowPositionals: true,
    });
    if (positionals.length !== 1) throw new Error('要畀一個劇集 folder');
    const folder = folderArg(positionals[0]);
    if (!existsSync(folder) || !statSync(folder).isDirectory())
        throw new Error(`搵唔到 folder：${folder}`);
    return { folder, ...values };
};

/** 冇 --out 就用 <id>.drama.json（冇 --id 用劇名），喺而家嘅 folder；同 scanDramaFolder 一樣用 NFC 劇名 */
const draftName = (args) =>
    `${args.id ?? basename(resolve(args.folder)).normalize('NFC')}${DRAFT_EXTENSION}`;
const outputPath = (args) => resolve(args.out ?? draftName(args));

const isDirectory = (path) => existsSync(path) && statSync(path).isDirectory();

/** 目的地本身係 folder：叫人喺 folder 後面加檔名（引號包住，有空格都照抄得） */
const fileHint = (option, folder, fileName) =>
    `要畀檔案路徑，例如 ${option} "${join(folder, fileName)}"`;

/** 路徑上面最近一個真係存在嘅地方（上層係檔案時 existsSync 會因 ENOTDIR 回 false，所以一路行上去） */
export const nearestExisting = (path, { exists = existsSync, parentOf = dirname } = {}) => {
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
const parentProblem = (label, path) => {
    const found = nearestExisting(dirname(path));
    if (found !== undefined && !isDirectory(found))
        return `[錯誤] ${label} 路徑入面嘅「${found}」係一個檔案，唔係 folder：${path}\n請檢查路徑有冇打錯（有空格要用引號包住）。`;
    return `[錯誤] ${label} 嘅 folder 唔存在：${dirname(path)}\n請先開好個 folder，或者檢查路徑有冇打錯（有空格要用引號包住）。`;
};

/** 寫得入嗎：POSIX 權限 / 唯讀 mount 擋得到；Windows ACL 唔保證準（最尾寫唔到仲有 EXIT.reportFailed 兜底） */
const canWrite = (path) => {
    try {
        accessSync(path, fsConstants.W_OK);
        return true;
    } catch {
        return false;
    }
};

/** 一個要寫嘅檔：上層 folder 要存在、寫得入，本身唔可以係 folder；錯就回傳點改，啱就 undefined */
const destinationProblem = ({ label, path, folderHint }, io) => {
    const parent = dirname(path);
    if (!isDirectory(parent)) return parentProblem(label, path);
    if (isDirectory(path)) return `[錯誤] ${label} 係一個 folder：${path}\n${folderHint}`;
    // 已經有個檔（--force 覆蓋）睇個檔本身；未有就睇上層 folder 開唔開得新檔
    const target = existsSync(path) ? path : parent;
    if (!io.canWrite(target))
        return `[錯誤] ${label} 冇權限寫入：${target}\n請揀另一個 folder，或者檢查權限 / 係咪唯讀磁碟。`;
    return undefined;
};

/**
 * 掃 folder 之前驗晒要寫嘅路徑（輸出 drama.json、--report）：
 * 唔係就要等成份報告印完、甚至 drama.json 寫咗先發現（CUI-0008 / S-568）
 */
/** 輸出 drama.json：有 --out 就叫人喺 folder 後面加 <id>.drama.json；預設名撞 folder 就叫人加 --out 或者搬走（QA O-1） */
const outputTarget = (args) => {
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

const reportTarget = (report) => {
    const path = resolve(report);
    return { label: '--report', path, folderHint: fileHint('--report', path, REPORT_EXAMPLE_NAME) };
};

const checkDestinations = (args, io) => {
    const targets = [outputTarget(args)];
    if (args.report !== undefined) targets.push(reportTarget(args.report));
    const problem = targets.map((target) => destinationProblem(target, io)).find(Boolean);
    if (problem !== undefined) throw new Error(problem);
};

const readExisting = (path) => {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        throw new Error(`讀唔到 --existing ${path}：${error.message}`, { cause: error });
    }
};

const verifyAll = async (result, args, io) => {
    if (result.json.audio.host !== 'r2') {
        io.out('\n--verify：呢套劇唔係放 R2（audio.host 唔係 r2），跳過');
        return EXIT.ok;
    }
    const urls = [
        ...episodeUrls(result.json, args.base),
        ...coverUrls(result.scan, result.json.audio.folder, args.base),
    ];
    io.out(`\n--verify：HEAD ${urls.length} 條網址…`);
    const failures = await verifyUrls(urls, { fetch: io.fetch });
    failures.forEach((f) =>
        io.out(`  [唔得] ${f.reason}  ${decodeURIComponent(f.url.slice(args.base.length + 1))}`),
    );
    io.out(failures.length === 0 ? '  全部 OK' : `  ${failures.length} 條唔得`);
    return failures.length === 0 ? EXIT.ok : EXIT.verifyFailed;
};

const defaultIo = {
    out: (text) => process.stdout.write(`${text}\n`),
    now: () => new Date(),
    fetch: (...args) => globalThis.fetch(...args),
    canWrite,
};

/** 輸出檔已存在又冇 --force：回傳點解唔寫（用戶通常冇版本控制，冚咗就冇得返轉頭） */
const overwriteRefusal = (out, args) => {
    if (args.force || !existsSync(out)) return undefined;
    const isExisting = args.existing !== undefined && resolve(args.existing) === out;
    const what = isExisting ? `${out} 就係 --existing 嗰個檔` : `${out} 已經存在`;
    return `${what}，冇覆蓋（冇寫任何檔）。要覆蓋請加 --force，或者用 --out 揀第二個名。`;
};

/** 生成 → 報告 → 寫檔 → （--verify）；回傳 exit code */
const generateAndWrite = async (args, existing, io) => {
    const result = generateDraft(args.folder, { id: args.id, existing, now: io.now() });
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

/**
 * --report：輸出照印上畫面，同時收埋；完咗用 UTF-8（冇 BOM，Windows 10 起記事本識讀）寫落檔，
 * 唔經 console code page，報告先唔會變亂碼。冇 --report 就原封不動。
 */
/** 最尾寫唔到報告檔：drama.json 寫咗就講明（唔好令人以為乜都冇寫而重行），回傳最終 exit code */
const reportWriteFailed = (code, args, error, io) => {
    const where = `${resolve(args.report)}（${error.message}）`;
    if (!DRAFT_WRITTEN_CODES.has(code)) {
        io.out(`\n寫唔到報告檔 ${where}`);
        return code;
    }
    io.out(`\ndrama.json 已經寫好（${outputPath(args)}），只係報告檔寫唔到：${where}`);
    io.out('上面畫面就係成份報告，可以直接複製；唔使重行。');
    return code === EXIT.ok ? EXIT.reportFailed : code;
};

const withReportFile = (io, args) => {
    const path = args.report;
    if (path === undefined) return { io, flush: (code) => code };
    const lines = [];
    const out = (text) => {
        lines.push(text);
        io.out(text);
    };
    const flush = (code) => {
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
const reportInternalError = (error, io) => {
    io.out(`\n程式出錯：${error?.message ?? error}`);
    io.out('呢個唔係 folder 嘅問題；請將成段輸出（連下面嘅技術資料）傳返嚟。');
    if (error?.stack) io.out(`\n技術資料：\n${error.stack}`);
    return EXIT.internal;
};

/** CLI 主流程；回傳 exit code（test 直接 call，唔使開 process） */
export const run = async (argv, ioOverrides = {}) => {
    const io = { ...defaultIo, ...ioOverrides };
    let args;
    let existing;
    try {
        args = readArgs(argv);
        checkDestinations(args, io);
        // 有畀 --existing 就一定要驗：檔入面係 null 都唔可以當冇畀
        existing = args.existing === undefined ? undefined : readExisting(args.existing);
    } catch (error) {
        io.out(`${error.message}\n${USAGE}`);
        return EXIT.usage;
    }
    const report = withReportFile(io, args);
    let code;
    try {
        code = await generateAndWrite(args, existing, report.io);
    } catch (error) {
        code = reportInternalError(error, report.io);
    }
    return report.flush(code);
};

/** 直接 node 行先跑 main；被 import（test）就唔跑 */
const isEntryPoint = () => {
    const entry = process.argv[1];
    return entry !== undefined && pathToFileURL(realpathSync(entry)).href === import.meta.url;
};

/** process.argv 頭兩個係 node 同 script 路徑 */
const ARGV_OFFSET = 2;

if (isEntryPoint()) process.exitCode = await run(process.argv.slice(ARGV_OFFSET));
