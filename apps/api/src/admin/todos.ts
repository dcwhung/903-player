/*
 * GET /api/todos：未解決 findings → admin 待辦矩陣（行 = 新內容，欄 = 資料夾 / ID / 圖片 / 排期 / 簡介）。
 * 每格：done（搞掂）/ must（必須，擋發佈）/ optional（選填）/ na（唔適用）+ 跳轉目標；全部由 entry 現況計
 */
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { listStoredEntries, type StoredEntry } from '../catalog/store';
import { isRecord, type Json } from '../content/http';
import { openFindings, resolveFindings, type FindingKind, type FindingRow } from './findings';

export const todoRoutes = new Hono<AppEnv>();

export type CellState = 'done' | 'must' | 'optional' | 'na';

export interface TodoCell {
    state: CellState;
    /** admin 跳轉目標（na 冇） */
    target?: string;
}

export type TodoColumn = 'folder' | 'id' | 'images' | 'schedule' | 'summary';

export interface TodoRow {
    kind: FindingKind;
    findingIds: number[];
    dramaId: string;
    arcId: string | null;
    name: string;
    cells: Record<TodoColumn, TodoCell>;
}

/** 掃描派嘅 placeholder ID（drama-01、arc-01）：要人手改 */
const PLACEHOLDER_ID = /^(drama|arc)-\d+$/;
const NA: TodoCell = { state: 'na' };

interface TodoContext {
    entry: StoredEntry;
    definition: Json;
    images: Json;
    /** 有排程規則嘅 arc id */
    scheduled: ReadonlySet<string>;
}

const cell = (done: boolean, missing: CellState, target: string): TodoCell => ({
    state: done ? 'done' : missing,
    target,
});

const arcsOf = (definition: Json): Json[] =>
    Array.isArray(definition.arcs) ? (definition.arcs as unknown[]).filter(isRecord) : [];

const hasImage = (images: Json, file: unknown): boolean =>
    typeof file === 'string' && typeof images[file] === 'string';

const dramaRow = ({
    entry,
    definition,
    images,
    scheduled: rules,
}: TodoContext): Record<TodoColumn, TodoCell> => {
    const base = `/dramas/${entry.id}`;
    const placeholders = [entry.id, ...arcsOf(definition).map((arc) => arc.id)].some(
        (id) => typeof id === 'string' && PLACEHOLDER_ID.test(id),
    );
    // 掃描建嘅劇 addedAt = 掃描當日，唔算排咗期：要上架（enabled）或者有排程規則
    const scheduled = definition.enabled === true || rules.size > 0;
    return {
        folder: cell(true, 'must', `${base}#folder`),
        id: cell(!placeholders, 'must', base),
        images: cell(
            hasImage(images, definition.tile) && hasImage(images, definition.disc),
            'must',
            `${base}#images`,
        ),
        schedule: cell(scheduled, 'must', `${base}/schedule`),
        summary: cell(typeof definition.summary === 'string', 'optional', base),
    };
};

const arcRow = (ctx: TodoContext, arc: Json): Record<TodoColumn, TodoCell> => {
    const arcId = String(arc.id ?? '');
    const target = `/dramas/${ctx.entry.id}/arcs#${arcId}`;
    return {
        folder: NA,
        id: cell(!PLACEHOLDER_ID.test(arcId), 'must', target),
        images: cell(hasImage(ctx.images, arc.disc), 'optional', target),
        schedule: cell(
            arc.enabled !== false || ctx.scheduled.has(arcId),
            'must',
            `/dramas/${ctx.entry.id}/schedule#${arcId}`,
        ),
        summary: cell(typeof arc.summary === 'string', 'optional', target),
    };
};

const episodesRow = (ctx: TodoContext, arcId: string | null): Record<TodoColumn, TodoCell> => {
    const scheduled = arcId === null || ctx.scheduled.has(arcId);
    const hash = arcId === null ? '' : `#${arcId}`;
    return {
        folder: NA,
        id: NA,
        images: NA,
        schedule: cell(scheduled, 'optional', `/dramas/${ctx.entry.id}/schedule${hash}`),
        summary: NA,
    };
};

const missingFolderRow = (ctx: TodoContext): Record<TodoColumn, TodoCell> => ({
    folder: { state: 'must', target: `/dramas/${ctx.entry.id}#folder` },
    id: NA,
    images: NA,
    schedule: NA,
    summary: NA,
});

const cellsOf = (
    kind: FindingKind,
    ctx: TodoContext,
    arc: Json | undefined,
    arcId: string | null,
) => {
    if (kind === 'newDrama') return dramaRow(ctx);
    if (kind === 'missingFolder') return missingFolderRow(ctx);
    if (kind === 'newArc') return arc ? arcRow(ctx, arc) : undefined;
    return episodesRow(ctx, arcId);
};

const nameOf = (definition: Json, arc: Json | undefined): string => {
    const drama = typeof definition.name === 'string' ? definition.name : '';
    if (!arc) return drama;
    const label = typeof arc.displayName === 'string' ? arc.displayName : String(arc.name ?? '');
    return `${drama} · ${label}`;
};

/**
 * finding 指嘅短篇：用 detail.arc（短篇 name = R2 子資料夾，永遠唔改）對，arc_id 係 placeholder，
 * admin 改咗 ID 就對唔到（C-013）；舊 / 冇 detail.arc 嘅 finding 先 fallback 用 arc_id
 */
const arcOfFinding = (finding: FindingRow, definition: Json): Json | undefined => {
    const detail = JSON.parse(finding.detail) as Json;
    const arcs = arcsOf(definition);
    if (typeof detail.arc === 'string') return arcs.find((a) => a.name === detail.arc);
    return arcs.find((a) => a.id === finding.arc_id);
};

const rowOf = (finding: FindingRow, ctx: TodoContext): TodoRow | undefined => {
    const arc = arcOfFinding(finding, ctx.definition);
    const arcId = typeof arc?.id === 'string' ? arc.id : finding.arc_id;
    const cells = cellsOf(finding.kind, ctx, arc, arcId);
    if (!cells) return undefined;
    const row = { kind: finding.kind, findingIds: [finding.id], dramaId: finding.drama_id };
    return { ...row, arcId, name: nameOf(ctx.definition, arc), cells };
};

/** 同一套劇 + 短篇 + kind 嘅 findings 合做一行；劇 / 短篇已經冇咗嘅行唔出 */
const toRows = (
    findings: readonly FindingRow[],
    contexts: ReadonlyMap<string, TodoContext>,
): TodoRow[] => {
    const rows = new Map<string, TodoRow>();
    findings.forEach((finding) => {
        const ctx = contexts.get(finding.drama_id);
        const row = ctx && rowOf(finding, ctx);
        if (!row) return;
        const key = `${row.kind}:${row.dramaId}:${row.arcId ?? ''}`;
        const existing = rows.get(key);
        if (existing) existing.findingIds.push(finding.id);
        else rows.set(key, row);
    });
    return [...rows.values()];
};

const scheduledArcs = async (db: D1Database): Promise<Map<string, Set<string>>> => {
    const rows = (
        await db
            .prepare('SELECT drama_id, arc_id FROM schedules')
            .all<{ drama_id: string; arc_id: string }>()
    ).results;
    const byDrama = new Map<string, Set<string>>();
    rows.forEach(({ drama_id: dramaId, arc_id: arcId }) =>
        byDrama.set(dramaId, new Set([...(byDrama.get(dramaId) ?? []), arcId])),
    );
    return byDrama;
};

const contextsOf = async (db: D1Database): Promise<Map<string, TodoContext>> => {
    const [entries, schedules] = await Promise.all([listStoredEntries(db), scheduledArcs(db)]);
    return new Map(
        entries
            .filter((entry) => entry.kind === 'dramas')
            .map((entry) => [
                entry.id,
                {
                    entry,
                    definition: JSON.parse(entry.definition) as Json,
                    images: JSON.parse(entry.images) as Json,
                    scheduled: schedules.get(entry.id) ?? new Set<string>(),
                },
            ]),
    );
};

const isBlocking = (row: TodoRow): boolean =>
    Object.values(row.cells).some((x) => x.state === 'must');

/** 未解決 findings 嘅待辦行（GET /api/todos、發佈後標 resolved 共用） */
export const loadTodoRows = async (db: D1Database): Promise<TodoRow[]> => {
    const [findings, contexts] = await Promise.all([openFindings(db), contextsOf(db)]);
    return toRows(findings, contexts);
};

/** 發佈成功之後：冇「必須」格嘅行嘅 findings 標 resolved（仲有必須嘅留低繼續做） */
export const resolveDoneFindings = async (db: D1Database, publishId: number): Promise<void> => {
    const done = (await loadTodoRows(db)).filter((row) => !isBlocking(row));
    await resolveFindings(
        db,
        publishId,
        done.flatMap((row) => row.findingIds),
    );
};

todoRoutes.get('/todos', async (c) => {
    const rows = await loadTodoRows(c.env.DB);
    return c.json({ rows, blocking: rows.filter(isBlocking).length });
});
