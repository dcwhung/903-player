/*
 * POST /api/scan（入 admin 自動掃描）：列 AUDIO 頂層資料夾 → 每套 r2 劇重新掃描（有 diff 先寫 + finding）；
 * 新資料夾 → 建 draft 劇（drama-NN、enabled: false）；有劇資料夾唔見 → 記「資料夾唔見」finding 等 admin 配對，
 * 而「睇落係佢改咗名」嘅新資料夾唔自動建（見 mightBeRenamed），其他新資料夾照建（S-800）。
 * 全部寫入放同一個 D1 batch；冇變就乜都唔寫
 */
import { generateDraft, hkToday, type DraftJson, type Issue } from '@903-player/catalog';
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { insertEntryStatement, listStoredEntries, type StoredEntry } from '../catalog/store';
import { nextUpdatedAt } from '../content/etag';
import { isRecord, type Json } from '../content/http';
import { listingFromR2 } from '../content/r2Listing';
import { findingView, insertFindingStatement, openFindings, type FindingRow } from './findings';
import { listTopFolders } from './r2Folders';
import { planRescan, r2FolderOf } from './rescan';

export const adminScanRoutes = new Hono<AppEnv>();

/** 掃描自動建嘅劇 ID：drama-01、drama-02…（要人手改做有意思嘅 ID，見 rename） */
const PLACEHOLDER_DRAMA_PREFIX = 'drama-';
const PLACEHOLDER_DRAMA_WIDTH = 2;

interface Skipped {
    dramaId?: string;
    folder: string;
    issues: Issue[];
}

interface Plan {
    statements: D1PreparedStatement[];
    findingIndexes: number[];
    skipped: Skipped[];
}

interface ScanContext {
    env: AppEnv['Bindings'];
    today: string;
    now: string;
}

const listOf = (value: unknown): Json[] => (Array.isArray(value) ? value.filter(isRecord) : []);

/** 短篇集 = 短篇名；每日播 = 日子：改名（R2 搬資料夾）唔會改到呢啲 */
const contentKeys = (definition: Json): Set<string> =>
    new Set(
        definition.kind === 'daily'
            ? listOf(definition.episodes).map((e) => String(e.date))
            : listOf(definition.arcs).map((a) => String(a.name)),
    );

/**
 * 新資料夾係咪可能係某套「資料夾唔見」嘅劇改咗名（S-800）。判斷準則：
 * 1. 種類一樣（短篇集 / 每日播；冇 kind 當短篇集），而且
 * 2. 內容有重疊：短篇集有最少一個短篇資料夾名同舊劇 arcs[].name 一樣；每日播有最少一日同舊劇 episodes[].date 一樣。
 * R2 冇 rename，改名 = 成個資料夾搬過去，短篇名 / 日子會原封不動，所以改名一定中；
 * 完全唔同嘅新劇（短篇名 / 日子冇一個一樣）就唔擋，照自動建 draft 劇。
 * 中咗嘅唔建，等 admin 喺「資料夾唔見」配對；配對咗之後下次掃描佢就唔再係新資料夾
 */
export const mightBeRenamed = (missing: Json, draft: Json): boolean => {
    const kindOf = (definition: Json) => (definition.kind === 'daily' ? 'daily' : 'series');
    if (kindOf(missing) !== kindOf(draft)) return false;
    const before = contentKeys(missing);
    return [...contentKeys(draft)].some((key) => before.has(key));
};

interface DramaRow {
    entry: StoredEntry;
    folder: string | undefined;
}

const addStatements = (plan: Plan, statements: D1PreparedStatement[], findingIndexes: number[]) => {
    const offset = plan.statements.length;
    plan.statements.push(...statements);
    plan.findingIndexes.push(...findingIndexes.map((i) => i + offset));
};

export const placeholderDramaIds = (taken: ReadonlySet<string>) => {
    let n = 0;
    return (): string => {
        let id: string;
        do {
            n += 1;
            id = `${PLACEHOLDER_DRAMA_PREFIX}${String(n).padStart(PLACEHOLDER_DRAMA_WIDTH, '0')}`;
        } while (taken.has(id));
        return id;
    };
};

/** draft 劇 + newDrama finding 加入 plan（finding 嘅 guard = entry 嘅 updated_at） */
const addNewDrama = (
    plan: Plan,
    { folder, id, draft }: { folder: string; id: string; draft: DraftJson },
    ctx: ScanContext,
) => {
    const updatedAt = nextUpdatedAt(undefined);
    const row = { kind: 'dramas' as const, id, definition: JSON.stringify(draft), images: '{}' };
    const finding = {
        kind: 'newDrama' as const,
        dramaId: id,
        detail: { folder, name: draft.name },
    };
    addStatements(
        plan,
        [
            insertEntryStatement(ctx.env.DB, row, updatedAt, true),
            insertFindingStatement(ctx.env.DB, finding, { createdAt: ctx.now, guard: updatedAt }),
        ],
        [1],
    );
};

/**
 * 新資料夾 → draft 劇（圖未有、placeholder ID、enabled: false）；回有冇建（冇建就唔用呢個 ID）。
 * missing = 資料夾唔見嗰啲劇嘅 definition：睇落係佢哋改名嘅唔建
 */
const planNewDrama = async (
    plan: Plan,
    { folder, id, missing }: { folder: string; id: string; missing: readonly Json[] },
    ctx: ScanContext,
): Promise<boolean> => {
    const listing = await listingFromR2(ctx.env.AUDIO, folder);
    const result = generateDraft(listing, { id, today: ctx.today, source: 'r2' });
    if (result.json === null) {
        plan.skipped.push({ folder, issues: result.issues.filter((i) => i.level === 'error') });
        return false;
    }
    const draft = result.json;
    if (missing.some((definition) => mightBeRenamed(definition, draft))) return false;
    addNewDrama(plan, { folder, id, draft }, ctx);
    return true;
};

const planMissing = (
    plan: Plan,
    missing: readonly DramaRow[],
    open: readonly FindingRow[],
    ctx: ScanContext,
) => {
    const flagged = new Set(open.filter((f) => f.kind === 'missingFolder').map((f) => f.drama_id));
    missing
        .filter(({ entry }) => !flagged.has(entry.id))
        .forEach(({ entry, folder }) => {
            const finding = {
                kind: 'missingFolder' as const,
                dramaId: entry.id,
                detail: { folder },
            };
            addStatements(
                plan,
                [insertFindingStatement(ctx.env.DB, finding, { createdAt: ctx.now })],
                [0],
            );
        });
};

const planExisting = async (plan: Plan, present: readonly DramaRow[], ctx: ScanContext) => {
    for (const { entry, folder = '' } of present) {
        const rescan = await planRescan(ctx.env, entry, { folder, today: ctx.today, now: ctx.now });
        if (rescan.errors.length > 0)
            plan.skipped.push({ dramaId: entry.id, folder, issues: rescan.errors });
        addStatements(plan, rescan.statements, rescan.findingIndexes);
    }
};

const dramaRowsOf = (entries: readonly StoredEntry[]): DramaRow[] =>
    entries
        .filter((entry) => entry.kind === 'dramas')
        .map((entry) => ({ entry, folder: r2FolderOf(JSON.parse(entry.definition) as Json) }))
        .filter((row) => row.folder !== undefined);

const buildPlan = async (ctx: ScanContext): Promise<Plan> => {
    const plan: Plan = { statements: [], findingIndexes: [], skipped: [] };
    const [folders, entries, open] = await Promise.all([
        listTopFolders(ctx.env.AUDIO),
        listStoredEntries(ctx.env.DB),
        openFindings(ctx.env.DB),
    ]);
    const existing = new Set(folders);
    const dramas = dramaRowsOf(entries);
    const missing = dramas.filter((d) => !existing.has(d.folder ?? ''));
    await planExisting(
        plan,
        dramas.filter((d) => existing.has(d.folder ?? '')),
        ctx,
    );
    planMissing(plan, missing, open, ctx);
    // 有劇資料夾唔見：睇落係佢改咗名嘅新資料夾唔自動建，等 admin 配對；其他照建（S-800）
    const missingDefinitions = missing.map((d) => JSON.parse(d.entry.definition) as Json);
    const used = new Set(dramas.map((d) => d.folder));
    const nextId = placeholderDramaIds(new Set(entries.map((e) => e.id)));
    let id = nextId();
    for (const folder of folders.filter((f) => !used.has(f))) {
        const created = await planNewDrama(plan, { folder, id, missing: missingDefinitions }, ctx);
        if (created) id = nextId();
    }
    return plan;
};

adminScanRoutes.post('/scan', async (c) => {
    const now = new Date();
    const ctx = { env: c.env, today: hkToday(now), now: now.toISOString() };
    const plan = await buildPlan(ctx);
    const results = plan.statements.length > 0 ? await c.env.DB.batch(plan.statements) : [];
    const findings = plan.findingIndexes
        .flatMap((i) => (results[i]?.results ?? []) as FindingRow[])
        .map(findingView);
    return c.json({ scannedAt: ctx.now, findings, skipped: plan.skipped });
});
