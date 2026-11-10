/*
 * POST /api/scan（入 admin 自動掃描）：列 AUDIO 頂層資料夾 → 每套 r2 劇重新掃描（有 diff 先寫 + finding）；
 * 新資料夾 → 建 draft 劇（drama-NN、enabled: false）；有劇資料夾唔見 → 唔自動建新劇（可能係改咗名），
 * 記「資料夾唔見」finding 等 admin 配對。全部寫入放同一個 D1 batch；冇變就乜都唔寫
 */
import { generateDraft, hkToday, type Issue } from '@903-player/catalog';
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { insertEntryStatement, listStoredEntries, type StoredEntry } from '../catalog/store';
import { nextUpdatedAt } from '../content/etag';
import type { Json } from '../content/http';
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

/** 新資料夾 → draft 劇（圖未有、placeholder ID、enabled: false） */
const planNewDrama = async (plan: Plan, folder: string, id: string, ctx: ScanContext) => {
    const listing = await listingFromR2(ctx.env.AUDIO, folder);
    const result = generateDraft(listing, { id, today: ctx.today });
    if (result.json === null) {
        plan.skipped.push({ folder, issues: result.issues.filter((i) => i.level === 'error') });
        return;
    }
    const updatedAt = nextUpdatedAt(undefined);
    const row = {
        kind: 'dramas' as const,
        id,
        definition: JSON.stringify(result.json),
        images: '{}',
    };
    const finding = {
        kind: 'newDrama' as const,
        dramaId: id,
        detail: { folder, name: result.json.name },
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
    // 有劇資料夾唔見：新資料夾可能係佢改咗名，唔自動建，等 admin 配對
    if (missing.length > 0) return plan;
    const used = new Set(dramas.map((d) => d.folder));
    const nextId = placeholderDramaIds(new Set(entries.map((e) => e.id)));
    for (const folder of folders.filter((f) => !used.has(f)))
        await planNewDrama(plan, folder, nextId(), ctx);
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
