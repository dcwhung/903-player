/*
 * 同現有 drama.json 合併：集數部份以 folder 為準，人手欄位（id、圖、addedAt、人手補嘅集名）照留，
 * folder 冇嘅短篇 / 日子保留兼提示；有變就出 [資料]，唔好靜靜雞改
 */
import { ID_PATTERN } from '../core/reader';
import { renderFileName } from '../dramas/filename';
import {
    arcEpisodeFile,
    episodeCountOf,
    firstNoOf,
    issue,
    rangeOf,
    seriesTokens,
    type AudioNaming,
} from './shared';
import type { DraftArc, Issue } from './types';
import type { ScanWording } from './wording';

/**
 * 短篇入面人手 / 排程寫嘅欄位照留（id 另外處理，固定放第一個）。上下架日子唔可以因為重新掃描而靜靜雞冇咗（W-705）；
 * 集數變咗而 key 超出範圍嘅交俾 PUT validator 422
 */
const HAND_WRITTEN_ARC_KEYS = [
    'disc',
    'tile',
    'addedAt',
    'removedAt',
    'episodeDates',
    'episodeRemovedAt',
    // Phase 3 admin 欄位：唔加就 rescan 會剷走
    'enabled',
    'displayName',
    'summary',
    'cast',
];
/** 新短篇嘅 placeholder id：arc-01、arc-02…（要人手改做有意思嘅 slug） */
const PLACEHOLDER_ARC_PREFIX = 'arc-';
const PLACEHOLDER_ARC_WIDTH = 2;

export interface MergeContext extends AudioNaming {
    today: string;
    wording: ScanWording;
}

export interface DailyEpisodeJson {
    date: string;
    [key: string]: unknown;
}

const pickHandWritten = (old: DraftArc) =>
    Object.fromEntries(
        HAND_WRITTEN_ARC_KEYS.filter((k) => old[k] !== undefined).map((k) => [k, old[k]]),
    );

/** 一個短篇每集嘅集名（episodes list 同 titles 合埋，titles 優先） */
const titlesOf = (arc: DraftArc): Map<number, string> => {
    const list = Array.isArray(arc.episodes) ? arc.episodes : [];
    const titles = new Map<number, string>(
        list.flatMap((t, i): [number, string][] =>
            typeof t === 'string' ? [[firstNoOf(arc) + i, t]] : [],
        ),
    );
    Object.entries(arc.titles ?? {}).forEach(([no, t]) => titles.set(Number(no), t));
    return titles;
};

const filesOf = (arc: DraftArc): Map<number, string> =>
    new Map(Object.entries(arc.files ?? {}).map(([no, f]) => [Number(no), f]));

/** 兩個 集數 → 值 map 有邊幾集唔同 */
const changedNos = (before: Map<number, string>, after: Map<number, string>): number[] =>
    [...new Set([...before.keys(), ...after.keys()])]
        .filter((no) => before.get(no) !== after.get(no))
        .sort((a, b) => a - b);

/** 舊 drama.json 有、檔名冇嘅集名（人手補嘅），只計 folder 而家有嘅集數 */
const handOnlyTitles = (old: DraftArc, fresh: DraftArc): [number, string][] => {
    const folderTitles = titlesOf(fresh);
    const last = firstNoOf(fresh) + (episodeCountOf(fresh) ?? 0) - 1;
    return [...titlesOf(old)].filter(
        ([no, title]) =>
            title !== '' && no >= firstNoOf(fresh) && no <= last && !folderTitles.has(no),
    );
};

const sortedRecord = (map: Map<number, string>) =>
    Object.fromEntries([...map].sort(([a], [b]) => a - b));

/** 由 集數 → 集名 map 砌返 episodes / titles（全部有集名就用 list，同 series 一樣） */
const episodeShape = (fresh: DraftArc, titles: Map<number, string>, files: Map<number, string>) => {
    const [first, count] = [firstNoOf(fresh), episodeCountOf(fresh) ?? 0];
    const all = titles.size === count;
    return {
        ...(first === 1 ? {} : { firstNo: first }),
        episodes: all ? rangeOf(first, first + count - 1).map((no) => titles.get(no)) : count,
        ...(!all && titles.size > 0 ? { titles: sortedRecord(titles) } : {}),
        ...(files.size > 0 ? { files: sortedRecord(files) } : {}),
    };
};

/**
 * 人手補嘅集名（檔名冇）照留：template 有 {title} 嘅話加埋集名會砌錯檔名，
 * 所以嗰集用 files 寫明真檔名，網址先唔會變。
 */
const keepHandTitles = (old: DraftArc, fresh: DraftArc, ctx: MergeContext, issues: Issue[]) => {
    const kept = handOnlyTitles(old, fresh);
    if (kept.length === 0) return fresh;
    const [titles, files] = [titlesOf(fresh), filesOf(fresh)];
    kept.forEach(([no, title]) => {
        const file = arcEpisodeFile(ctx, fresh, no);
        titles.set(no, title);
        const tokens = seriesTokens(ctx.audio.folder, fresh.name, no, title);
        if (renderFileName(ctx.audio.file, tokens) !== file) files.set(no, file);
        const message = `第 ${no} 集嘅集名「${title}」檔名冇，係人手加嘅；已保留（用 files 寫明真檔名，網址唔變）`;
        issues.push(issue('warn', fresh.name, message));
    });
    return { name: fresh.name, ...episodeShape(fresh, titles, files) } as DraftArc;
};

/** 集數、第幾集開始、集名、files 有變就講一聲（以 folder 為準，但唔好靜靜雞改） */
const arcChangeIssues = (old: DraftArc, merged: DraftArc): Issue[] => {
    const changes: string[] = [];
    const [before, after] = [episodeCountOf(old), episodeCountOf(merged)];
    if (before !== after) changes.push(`集數由 ${before} 變 ${after}`);
    if (firstNoOf(old) !== firstNoOf(merged))
        changes.push(`由第 ${firstNoOf(old)} 集開始變第 ${firstNoOf(merged)} 集開始`);
    const titles = changedNos(titlesOf(old), titlesOf(merged));
    if (titles.length > 0) changes.push(`集名有變（第 ${titles.join('、')} 集）`);
    const files = changedNos(filesOf(old), filesOf(merged));
    if (files.length > 0) changes.push(`files 有變（第 ${files.join('、')} 集）`);
    return changes.map((message) => issue('info', merged.name, message));
};

/** 舊短篇：人手欄位（id、人手補嘅集名）照留，集數部份用 folder 嘅 */
const mergeArc = (old: DraftArc, fresh: DraftArc, ctx: MergeContext, issues: Issue[]) => {
    const episodePart = Object.fromEntries(
        Object.entries(keepHandTitles(old, fresh, ctx, issues)).filter(([key]) => key !== 'name'),
    );
    const id = old.id === undefined ? {} : { id: old.id };
    const merged: DraftArc = { ...id, name: old.name, ...pickHandWritten(old), ...episodePart };
    issues.push(...arcChangeIssues(old, merged));
    return merged;
};

/** 舊短篇照原次序，folder 冇嘅保留兼提示；新短篇加喺尾，addedAt = 今日 */
export const mergeArcs = (
    oldArcs: readonly DraftArc[],
    freshArcs: readonly DraftArc[],
    ctx: MergeContext,
    issues: Issue[],
): DraftArc[] => {
    const fresh = new Map(freshArcs.map((a) => [a.name, a]));
    const kept = oldArcs.map((old) => {
        const match = fresh.get(old.name);
        if (!match) {
            issues.push(issue('warn', old.name, ctx.wording.missingArc));
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

/** 每日劇：舊集嘅 rerun / file 照留，folder 冇嘅保留兼提示（新到舊） */
export const mergeDaily = (
    oldEpisodes: readonly DailyEpisodeJson[],
    dates: readonly string[],
    issues: Issue[],
    wording: ScanWording,
): DailyEpisodeJson[] => {
    const old = new Map(oldEpisodes.map((e) => [e.date, e]));
    const missing = oldEpisodes.filter((e) => !dates.includes(e.date));
    missing.forEach((e) => issues.push(issue('warn', e.date, wording.missingDay)));
    const merged = [...dates.map((date) => old.get(date) ?? { date }), ...missing];
    return merged.sort((a, b) => b.date.localeCompare(a.date));
};

const numbered = (prefix: string, n: number): string =>
    `${prefix}${String(n).padStart(PLACEHOLDER_ARC_WIDTH, '0')}`;

/**
 * 冇 id 嘅短篇（新短篇）自動派 id（避開已經用咗嘅），逐個出 TODO 提示人手確認：
 * id 係 episode ID（進度 / 收藏 key）嘅一部份，發佈之後唔可以再改。
 * 知道劇 ID（合 ID_PATTERN）就用「<劇 ID>-NN」，號碼由已有 id 嘅短篇數 + 1 起（例如 lancy-04，Phase 3c）；
 * 唔知（CLI 冇 --id）就照舊 arc-NN
 */
export const withArcIds = (
    arcs: readonly DraftArc[],
    issues: Issue[],
    dramaId?: string,
): DraftArc[] => {
    const used = new Set(arcs.flatMap((arc) => (arc.id === undefined ? [] : [arc.id])));
    const known = dramaId !== undefined && ID_PATTERN.test(dramaId);
    const prefix = known ? `${dramaId}-` : PLACEHOLDER_ARC_PREFIX;
    let n = known ? used.size : 0;
    const nextFree = () => {
        do n += 1;
        while (used.has(numbered(prefix, n)));
        return numbered(prefix, n);
    };
    return arcs.map((arc) => {
        if (arc.id !== undefined) return arc;
        const id = nextFree();
        const message = known
            ? `TODO：id「${id}」係自動編號，請喺 admin 確認或修改；發佈之後唔可以再改`
            : `TODO：id「${id}」係 placeholder，請改做英文 slug（有圖就用 arcs/<slug>/ folder 名）；發佈之後唔可以再改`;
        issues.push(issue('warn', arc.name, message));
        return { id, ...arc };
    });
};
