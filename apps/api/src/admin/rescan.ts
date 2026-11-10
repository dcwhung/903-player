/*
 * 一套劇重新掃描（POST /api/scan、資料夾配對共用）：listingFromR2 + generateDraft 同現有 definition 合併，
 * 有 diff 先寫（新短篇預設 enabled: false：未排期唔會上架）+ 記 finding；冇變就乜都唔寫
 */
import { generateDraft, type DraftJson, type Issue } from '@903-player/catalog';
import { updateEntryStatement, type StoredEntry } from '../catalog/store';
import { jsonDiff } from '../content/diff';
import { nextUpdatedAt } from '../content/etag';
import { isRecord, type Json } from '../content/http';
import { listingFromR2 } from '../content/r2Listing';
import { insertFindingStatement, type NewFinding } from './findings';

type Arc = Json & { name: string; id?: string };

export interface RescanPlan {
    /** 要寫嘅 statement（entry 更新 + findings）；冇變就空 */
    statements: D1PreparedStatement[];
    /** statements 入面邊幾個係 finding insert（RETURNING 新 finding） */
    findingIndexes: number[];
    /** generateDraft 有 [錯誤]：唔寫，回畀 admin */
    errors: Issue[];
    definition: Json;
    updatedAt?: string;
}

/** definition.audio：host 係 r2 先掃得 */
export const r2FolderOf = (definition: Json): string | undefined => {
    const audio = definition.audio;
    if (!isRecord(audio) || audio.host !== 'r2' || typeof audio.folder !== 'string')
        return undefined;
    return audio.folder;
};

const arcsOf = (definition: Json): Arc[] =>
    Array.isArray(definition.arcs)
        ? (definition.arcs as unknown[]).filter(
              (arc): arc is Arc => isRecord(arc) && typeof arc.name === 'string',
          )
        : [];

const episodeCountOf = (arc: Json): number => {
    const { episodes } = arc;
    if (typeof episodes === 'number') return episodes;
    return Array.isArray(episodes) ? episodes.length : 0;
};

const firstNoOf = (arc: Json): number => (typeof arc.firstNo === 'number' ? arc.firstNo : 1);

/** 掃描新加嘅短篇：未排期唔上架 */
const withNewArcsDisabled = (before: Json, after: DraftJson): Json => {
    if (!Array.isArray(after.arcs)) return after;
    const known = new Set(arcsOf(before).map((arc) => arc.name));
    const arcs = arcsOf(after).map((arc) =>
        known.has(arc.name) ? arc : { ...arc, enabled: false },
    );
    return { ...after, arcs };
};

const arcFindings = (dramaId: string, before: Json, after: Json): NewFinding[] => {
    const old = new Map(arcsOf(before).map((arc) => [arc.name, arc]));
    return arcsOf(after).flatMap((arc): NewFinding[] => {
        const previous = old.get(arc.name);
        const base = { dramaId, arcId: arc.id };
        if (!previous)
            return [
                {
                    ...base,
                    kind: 'newArc',
                    detail: { arc: arc.name, episodes: episodeCountOf(arc) },
                },
            ];
        const [from, to] = [episodeCountOf(previous), episodeCountOf(arc)];
        if (to <= from) return [];
        const first = firstNoOf(arc);
        const detail = { arc: arc.name, first: first + from, last: first + to - 1 };
        return [{ ...base, kind: 'newEpisodes', detail }];
    });
};

const datesOf = (definition: Json): string[] =>
    Array.isArray(definition.episodes)
        ? (definition.episodes as unknown[]).flatMap((e) =>
              isRecord(e) && typeof e.date === 'string' ? [e.date] : [],
          )
        : [];

const dailyFindings = (dramaId: string, before: Json, after: Json): NewFinding[] => {
    const old = new Set(datesOf(before));
    const dates = datesOf(after)
        .filter((date) => !old.has(date))
        .sort();
    return dates.length === 0 ? [] : [{ kind: 'newEpisodes', dramaId, detail: { dates } }];
};

export const scanFindings = (dramaId: string, before: Json, after: Json): NewFinding[] =>
    after.kind === 'daily'
        ? dailyFindings(dramaId, before, after)
        : arcFindings(dramaId, before, after);

/** entry 更新（樂觀鎖）+ findings（entry 寫到先記） */
const writePlan = (
    db: D1Database,
    entry: StoredEntry,
    { before, next, now }: { before: Json; next: Json; now: string },
) => {
    const updatedAt = nextUpdatedAt(entry.updated_at);
    const row = {
        kind: entry.kind,
        id: entry.id,
        definition: JSON.stringify(next),
        images: entry.images,
    };
    const findings = scanFindings(entry.id, before, next).map((finding) =>
        insertFindingStatement(db, finding, { createdAt: now, guard: updatedAt }),
    );
    return {
        statements: [
            updateEntryStatement(db, row, { expected: entry.updated_at, updatedAt }),
            ...findings,
        ],
        findingIndexes: findings.map((_, i) => i + 1),
        updatedAt,
    };
};

/** 已經揀好 R2 資料夾嘅劇：掃描 + 砌寫入 statements（未執行） */
export const planRescan = async (
    env: { DB: D1Database; AUDIO: R2Bucket },
    entry: StoredEntry,
    {
        folder,
        today,
        now,
        definition = JSON.parse(entry.definition) as Json,
    }: {
        folder: string;
        today: string;
        now: string;
        definition?: Json;
    },
): Promise<RescanPlan> => {
    const listing = await listingFromR2(env.AUDIO, folder);
    const result = generateDraft(listing, { id: entry.id, existing: definition, today });
    const errors = result.issues.filter((i) => i.level === 'error');
    const before = JSON.parse(entry.definition) as Json;
    const empty = { statements: [], findingIndexes: [], errors, definition };
    if (result.json === null) return empty;
    const next = withNewArcsDisabled(definition, result.json);
    if (jsonDiff(before, next).length === 0) return { ...empty, definition: next };
    return { ...writePlan(env.DB, entry, { before, next, now }), errors, definition: next };
};
