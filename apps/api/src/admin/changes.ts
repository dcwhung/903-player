/*
 * GET /api/changes：而家 D1（唔包 draft）vs 最新 ok publish → 時間線 + 驗證結果（admin 確認發佈頁一次 call）。
 * 選擇發佈（0.10.0）：appearance（App 外觀三項各自有冇改）、others（唔計新內容 / App 外觀嘅其他改動）；
 * ?selection=<JSON> 就 changes / validation / warnings / unchanged 跟 selection 計（同 POST /api/publish 一樣）
 */
import { hkToday, summarizeChanges, type ChangeDocument } from '@903-player/catalog';
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { getBanner } from '../banner/store';
import { getBranding } from '../branding/store';
import {
    PublishValidationError,
    sameContent,
    validateDocument,
    type DocumentContext,
} from '../catalog/publish';
import { selectDramas } from '../catalog/selectDocument';
import { EMPTY_SELECTION, planSelection, type SelectionPlan } from '../catalog/selection';
import {
    checkedPlan,
    documentFor,
    selectionErrorResponse,
    selectionFromQuery,
} from '../catalog/selectivePublish';
import { latestPublish, listAssetHashes, listEntries, type EntryRow } from '../catalog/store';
import type { PublishWarning } from '../catalog/warnings';
import { appearanceChanges, previewDocument, publishedDocument } from './changeDocuments';
import { loadTodoRows } from './todos';

export const changeRoutes = new Hono<AppEnv>();

type Validation = { ok: true; episodeCount: number } | { ok: false; error: string };

interface Checked {
    validation: Validation;
    warnings: PublishWarning[];
    /** 照呢個 selection 發佈會回 unchanged（除 generatedAt 外同最新一次一樣） */
    unchanged: boolean;
}

/** 驗證結果 + 警告（驗證唔過就冇警告） */
const validationOf = (
    rows: readonly EntryRow[],
    context: Omit<DocumentContext, 'generatedAt'>,
    { plan, latestJson }: { plan: SelectionPlan | undefined; latestJson: string | undefined },
): Checked => {
    try {
        const generatedAt = new Date().toISOString();
        const selected = plan && { plan, latestJson };
        const { json, listedEpisodeIds, warnings } = validateDocument(
            documentFor(rows, { ...context, generatedAt }, selected),
        );
        const unchanged = latestJson !== undefined && sameContent(latestJson, json);
        return {
            validation: { ok: true, episodeCount: listedEpisodeIds.length },
            warnings,
            unchanged,
        };
    } catch (error) {
        if (!(error instanceof PublishValidationError)) throw error;
        return { validation: { ok: false, error: error.message }, warnings: [], unchanged: false };
    }
};

/** 預覽 document 套用 plan（冇 plan = 全部） */
const previewFor = (
    preview: ChangeDocument,
    plan: SelectionPlan | undefined,
    published: ChangeDocument | null,
): ChangeDocument =>
    plan
        ? {
              shows: preview.shows,
              dramas: selectDramas(preview.dramas, plan, published?.dramas ?? []),
          }
        : preview;

const loadState = async (db: D1Database) => {
    const [rows, latest, assets, stored, branding, todos] = await Promise.all([
        listEntries(db),
        latestPublish(db),
        listAssetHashes(db),
        getBanner(db),
        getBranding(db),
        loadTodoRows(db),
    ]);
    const banner = stored && { standard: stored.standard, long: stored.long };
    return { rows, latest, assets, banner, branding, todos };
};

const changesOf = async (env: AppEnv['Bindings'], query: string | undefined) => {
    const selection = selectionFromQuery(query);
    const { rows, latest, assets, banner, branding, todos } = await loadState(env.DB);
    const plan = selection && checkedPlan(todos, selection);
    const origin = env.WORKER_ORIGIN;
    const published = latest ? publishedDocument(latest.document) : null;
    const preview = previewDocument(rows, origin);
    const summarize = (selected: SelectionPlan | undefined) =>
        summarizeChanges(published, previewFor(preview, selected, published), hkToday());
    const appearance = appearanceChanges({ branding, banner }, latest?.document, origin);
    // 有 selection：只計揀咗嘅部分
    const picked = plan?.appearance ?? { icon: true, text: true, banner: true };
    return {
        base: latest?.row.id ?? null,
        changes: summarize(plan),
        ...validationOf(
            rows,
            { origin, assets, banner, branding },
            {
                plan,
                latestJson: latest?.document,
            },
        ),
        bannerChanged: appearance.banner && picked.banner,
        brandingChanged: (appearance.icon && picked.icon) || (appearance.text && picked.text),
        appearance,
        others: summarize(planSelection(todos, EMPTY_SELECTION)),
        ...(plan ? { selection: { content: plan.content, skipped: plan.skipped } } : {}),
    };
};

changeRoutes.get('/changes', async (c) => {
    try {
        return c.json(await changesOf(c.env, c.req.query('selection')));
    } catch (error) {
        const response = selectionErrorResponse(c, error);
        if (response) return response;
        throw error;
    }
});
