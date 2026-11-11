/*
 * FolderListing → drama.json 草稿 + 問題清單（純邏輯；CLI 同 Worker 共用）。
 * 有 error 嘅話 json 係 null（唔好寫檔 / 唔好存）
 */
import { ID_PATTERN } from '../core/reader';
import { analyseDaily } from './daily';
import { existingFolderIssues, existingProblem, isPlainObject } from './existing';
import { scanListing } from './listing';
import { mergeArcs, mergeDaily, withArcIds, type DailyEpisodeJson } from './merge';
import { analyseSeries, nameIssues } from './series';
import { DAILY_TEMPLATE, issue } from './shared';
import type {
    DraftArc,
    DraftJson,
    DraftKind,
    DraftOptions,
    DraftResult,
    DramaScan,
    FolderListing,
    Issue,
} from './types';

/** 新劇未有設計色調：先用 app 嘅中性色（NEUTRAL_THEME 去咗 art），上架前要按封面改 */
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

type Built = Omit<DraftResult, 'scan' | 'kind' | 'today' | 'json'> & { json: DraftJson };

const newDramaBase = (scan: DramaScan, kind: DraftKind, template: string): DraftJson => ({
    name: scan.name,
    kind,
    enabled: false,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: { host: 'r2', folder: scan.name, file: template },
    theme: { ...PLACEHOLDER_THEME },
});

const templateOf = (existing: DraftJson | undefined): string | undefined => {
    const audio = existing?.audio;
    return isPlainObject(audio) ? (audio.file as string | undefined) : undefined;
};

const seriesJson = (
    scan: DramaScan,
    existing: DraftJson | undefined,
    { today, id }: { today: string; id: string | undefined },
): Built => {
    const analysis = analyseSeries(scan, templateOf(existing));
    if (!existing) {
        const json = {
            ...newDramaBase(scan, 'series', analysis.template),
            addedAt: today,
            arcs: withArcIds(analysis.arcs, analysis.issues, id),
        };
        return { ...analysis, json };
    }
    analysis.issues.push(...existingFolderIssues(scan, existing));
    const ctx = { audio: { file: analysis.template, folder: scan.name }, today };
    const oldArcs = (existing.arcs as DraftArc[] | undefined) ?? [];
    const merged = mergeArcs(oldArcs, analysis.arcs, ctx, analysis.issues);
    return { ...analysis, json: { ...existing, arcs: withArcIds(merged, analysis.issues, id) } };
};

const dailyJson = (scan: DramaScan, existing: DraftJson | undefined): Built => {
    const analysis = analyseDaily(scan);
    if (!existing) {
        const episodes = analysis.dates.map((date) => ({ date }));
        return { ...analysis, json: { ...newDramaBase(scan, 'daily', DAILY_TEMPLATE), episodes } };
    }
    analysis.issues.push(...existingFolderIssues(scan, existing));
    const oldEpisodes = (existing.episodes as DailyEpisodeJson[] | undefined) ?? [];
    const episodes = mergeDaily(oldEpisodes, analysis.dates, analysis.issues);
    return { ...analysis, json: { ...existing, episodes } };
};

/** 劇集層嘅檢查：folder 名、亂放嘅錄音、id */
const dramaIssues = (scan: DramaScan, id: string | undefined, kind: DraftKind): Issue[] => {
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

const kindOf = (scan: DramaScan): DraftKind =>
    scan.arcs.length > 0 ? 'series' : scan.audio.length > 0 ? 'daily' : 'none';

const orderKeys = (json: DraftJson): DraftJson => {
    const known = TOP_LEVEL_ORDER.filter((k) => json[k] !== undefined).map((k) => [k, json[k]]);
    const extra = Object.entries(json).filter(
        ([k, v]) => !TOP_LEVEL_ORDER.includes(k) && v !== undefined,
    );
    return Object.fromEntries([...known, ...extra]) as DraftJson;
};

const buildJson = (
    scan: DramaScan,
    kind: 'series' | 'daily',
    existing: unknown,
    options: { today: string; id: string | undefined },
) => {
    const old = existing as DraftJson | undefined;
    return kind === 'series' ? seriesJson(scan, old, options) : dailyJson(scan, old);
};

/** listing → drama.json 草稿 + 問題清單；existing 有就合併（人手欄位照留） */
export const generateDraft = (listing: FolderListing, options: DraftOptions): DraftResult => {
    const { id, existing, today } = options;
    const scan = scanListing(listing);
    const kind = kindOf(scan);
    const base = { scan, kind, today, issues: dramaIssues(scan, id, kind) };
    if (kind === 'none') return { ...base, json: null, summaries: [] } as DraftResult;
    // 壞 / 唔夾嘅 existing 要喺用之前停，唔好砌到一半 throw
    const problem = existing === undefined ? undefined : existingProblem(existing, kind);
    if (problem !== undefined) {
        const issues = [...base.issues, issue('error', scan.name, problem)];
        return { ...base, issues, json: null, summaries: [] } as DraftResult;
    }
    const built = buildJson(scan, kind, existing, { today, id });
    const issues = [...base.issues, ...built.issues];
    const blocked = issues.some((i) => i.level === 'error');
    const json = blocked ? null : orderKeys(built.json);
    return { ...base, ...built, issues, json } as DraftResult;
};
