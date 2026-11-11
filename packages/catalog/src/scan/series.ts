/* 短篇劇：逐個短篇 parse 檔名 + 檢查，揀檔名 template，砌 arcs（episodes / titles / files） */
import { renderFileName } from '../dramas/filename';
import { findSuspicious, parseEpisodeFileName, type ParsedEpisodeFile } from './names';
import { issue, rangeOf, SERIES_TEMPLATES, seriesTokens } from './shared';
import type { ArcScan, ArcSummary, DraftArc, DramaScan, Issue } from './types';
import type { ScanWording } from './wording';

/** 短篇正常由第 0 集（前傳）或者第 1 集開始 */
const USUAL_FIRST_NOS = new Set([0, 1]);
const FIRST_NO_DEFAULT = 1;

interface ReadArc {
    arc: ArcScan;
    episodes: ParsedEpisodeFile[];
    issues: Issue[];
}

export interface SeriesAnalysis {
    template: string;
    arcs: DraftArc[];
    issues: Issue[];
    summaries: ArcSummary[];
}

export const nameIssues = (where: string, rawName: string, wording: ScanWording): Issue[] =>
    findSuspicious(rawName, wording).map((message) =>
        issue('warn', where, `「${rawName}」${message}`),
    );

/** 檔名 → 集；讀唔到 / 集數對唔上嘅記低錯誤 */
const parseArcFiles = (arc: ArcScan, issues: Issue[]): ParsedEpisodeFile[] =>
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
const fileNameIssues = (arc: ArcScan, wording: ScanWording): Issue[] => {
    const seen = new Map<string, Issue>();
    arc.audio.forEach((file) =>
        findSuspicious(file, wording).forEach((message) => {
            const kind = message.replace(/「.*?」|\(U\+[0-9A-F]+\)/g, '');
            if (!seen.has(kind))
                seen.set(kind, issue('warn', arc.name, `檔名「${file}」${message}`));
        }),
    );
    return [...seen.values()];
};

/** 重複 / 跳號（schema 要求 firstNo 起連續） */
const numberingIssues = (arc: ArcScan, episodes: readonly ParsedEpisodeFile[]): Issue[] => {
    const counts = new Map<number, number>();
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

/** 讀短篇：解析檔名 + 所有檢查（未揀 template） */
const readSeriesArc = (arc: ArcScan, wording: ScanWording): ReadArc => {
    const issues = nameIssues(arc.name, arc.rawName, wording);
    const episodes = parseArcFiles(arc, issues);
    issues.push(...fileNameIssues(arc, wording), ...numberingIssues(arc, episodes));
    episodes.sort((a, b) => a.no - b.no);
    return { arc, episodes, issues };
};

const renderEpisode = (template: string, folder: string, arcName: string, e: ParsedEpisodeFile) =>
    renderFileName(template, seriesTokens(folder, arcName, e.no, e.title));

/** 揀最多檔名完全對得上嘅 template（打和用第一個） */
const chooseTemplate = (folder: string, readArcs: readonly ReadArc[]): string => {
    const score = (template: string) =>
        readArcs.reduce(
            (sum, { arc, episodes }) =>
                sum +
                episodes.filter((e) => renderEpisode(template, folder, arc.name, e) === e.file)
                    .length,
            0,
        );
    return SERIES_TEMPLATES.reduce((best, t) => (score(t) > score(best) ? t : best));
};

export const mapOf = <T>(
    items: readonly T[],
    keyOf: (item: T) => number,
    valueOf: (item: T) => string,
) => Object.fromEntries(items.map((item) => [keyOf(item), valueOf(item)]));

/** 全部有集名 → 集名 list；部份有 → 集數 + titles；template 砌唔返嘅檔 → files */
const episodeFields = (
    template: string,
    folder: string,
    arcName: string,
    episodes: readonly ParsedEpisodeFile[],
): Omit<DraftArc, 'name'> => {
    const firstNo = episodes[0]?.no ?? FIRST_NO_DEFAULT;
    const count = episodes.length;
    const titled = episodes.filter((e) => e.title !== '');
    const files = episodes.filter((e) => renderEpisode(template, folder, arcName, e) !== e.file);
    const all = titled.length === count;
    const no = (e: ParsedEpisodeFile) => e.no;
    return {
        ...(firstNo === FIRST_NO_DEFAULT ? {} : { firstNo }),
        episodes: all ? episodes.map((e) => e.title) : count,
        ...(!all && titled.length > 0 ? { titles: mapOf(titled, no, (e) => e.title) } : {}),
        ...(files.length > 0 ? { files: mapOf(files, no, (e) => e.file) } : {}),
    };
};

/** 檔名入面嘅短篇名同 template 預期唔同（例如 folder 用 II、檔名用 Ⅱ） */
const labelIssues = (template: string, folder: string, { arc, episodes }: ReadArc): Issue[] => {
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

const overrideIssue = (arcName: string, fields: Omit<DraftArc, 'name'>): Issue[] => {
    const files = Object.values(fields.files ?? {});
    if (files.length === 0) return [];
    const example = files[0] ?? '';
    return [
        issue(
            'warn',
            arcName,
            `${files.length} 集檔名唔跟 template，已用 files 逐集寫明（例如「${example}」）`,
        ),
    ];
};

const summaryOf = ({ arc, episodes }: ReadArc): ArcSummary => ({
    name: arc.name,
    count: episodes.length,
    first: episodes[0]?.no,
    last: episodes.at(-1)?.no,
    titled: episodes.filter((e) => e.title !== '').length,
    covers: arc.covers,
    ignored: arc.ignored,
});

/** 讀晒每個短篇 → 揀 template（existing 有就用佢嘅）→ 砌 arcs */
export const analyseSeries = (
    scan: DramaScan,
    template: string | undefined,
    wording: ScanWording,
): SeriesAnalysis => {
    const read = scan.arcs.map((arc) => readSeriesArc(arc, wording));
    const chosen = template ?? chooseTemplate(scan.name, read);
    const issues = read.flatMap((r) => [...r.issues, ...labelIssues(chosen, scan.name, r)]);
    const arcs = read.map(({ arc, episodes }) => {
        const fields = episodeFields(chosen, scan.name, arc.name, episodes);
        issues.push(...overrideIssue(arc.name, fields));
        return { name: arc.name, ...fields };
    });
    return { template: chosen, arcs, issues, summaries: read.map(summaryOf) };
};
