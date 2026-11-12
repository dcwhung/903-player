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

/** 掃描派嘅劇 ID（drama-01）：admin 確認（confirm-id）或者改咗名先算搞掂 */
const PLACEHOLDER_DRAMA_ID = /^drama-\d+$/;
/** 3c 之前掃描派嘅短篇 placeholder（arc-01）：一定要改 */
const LEGACY_ARC_ID = /^arc-\d+$/;
const NA: TodoCell = { state: 'na' };
/** 資料夾係掃描搵到嘅（新短篇 / 新集數）：已經存在 = done；「–」只留畀真係唔適用嘅格 */
const folderFound = (dramaId: string): TodoCell => ({
    state: 'done',
    target: `/dramas/${dramaId}#folder`,
});

interface TodoContext {
    entry: StoredEntry;
    /** 呢個 finding 嘅 ID 已經由 admin 確認（POST /api/todos/confirm-id） */
    idConfirmed?: boolean;
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
    idConfirmed = false,
}: TodoContext): Record<TodoColumn, TodoCell> => {
    const base = `/dramas/${entry.id}`;
    // 改咗名（唔再係 drama-NN）都算確認；短篇 ID 跟劇 ID 編號，改劇 ID 時一齊改（rename）
    const dramaIdOk = idConfirmed || !PLACEHOLDER_DRAMA_ID.test(entry.id);
    const legacyArcs = arcsOf(definition).some(
        (arc) => typeof arc.id === 'string' && LEGACY_ARC_ID.test(arc.id),
    );
    // 掃描建嘅劇 addedAt = 掃描當日，唔算排咗期：要上架（enabled）或者有排程規則
    const scheduled = definition.enabled === true || rules.size > 0;
    return {
        folder: cell(true, 'must', `${base}#folder`),
        id: cell(dramaIdOk && !legacyArcs, 'must', base),
        images: cell(
            hasImage(images, definition.tile) && hasImage(images, definition.disc),
            'must',
            `${base}#images`,
        ),
        schedule: cell(scheduled, 'must', `${base}/schedule`),
        summary: cell(typeof definition.summary === 'string', 'optional', base),
    };
};

/**
 * 新短篇 ID：掃描自動編號（<劇 ID>-NN），admin 確認（confirm-id）先算搞掂；
 * 改咗（同 finding 記低嘅自動 ID 唔同）都算確認
 */
const arcIdDone = (ctx: TodoContext, arcId: string, scannedId: string | null): boolean =>
    ctx.idConfirmed === true || (arcId !== scannedId && !LEGACY_ARC_ID.test(arcId));

const arcRow = (
    ctx: TodoContext,
    arc: Json,
    scannedId: string | null,
): Record<TodoColumn, TodoCell> => {
    const arcId = String(arc.id ?? '');
    const target = `/dramas/${ctx.entry.id}/arcs#${arcId}`;
    return {
        folder: folderFound(ctx.entry.id),
        id: cell(arcIdDone(ctx, arcId, scannedId), 'must', target),
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
        folder: folderFound(ctx.entry.id),
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
    finding: FindingRow,
    ctx: TodoContext,
    arc: Json | undefined,
    arcId: string | null,
) => {
    const { kind } = finding;
    if (kind === 'newDrama') return dramaRow(ctx);
    if (kind === 'missingFolder') return missingFolderRow(ctx);
    if (kind === 'newArc') return arc ? arcRow(ctx, arc, finding.arc_id) : undefined;
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
export const arcOfFinding = (finding: FindingRow, definition: Json): Json | undefined => {
    const detail = JSON.parse(finding.detail) as Json;
    const arcs = arcsOf(definition);
    if (typeof detail.arc === 'string') return arcs.find((a) => a.name === detail.arc);
    return arcs.find((a) => a.id === finding.arc_id);
};

/** finding.detail.idConfirmed（confirm-id 寫） */
export const isIdConfirmed = (finding: FindingRow): boolean =>
    (JSON.parse(finding.detail) as Json).idConfirmed === true;

const rowOf = (finding: FindingRow, base: TodoContext): TodoRow | undefined => {
    const ctx = { ...base, idConfirmed: isIdConfirmed(finding) };
    const arc = arcOfFinding(finding, ctx.definition);
    const arcId = typeof arc?.id === 'string' ? arc.id : finding.arc_id;
    const cells = cellsOf(finding, ctx, arc, arcId);
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
