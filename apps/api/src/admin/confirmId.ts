/*
 * POST /api/todos/confirm-id { dramaId, arcId? }：admin 儲存 ID 欄（就算冇改）= 確認掃描自動派嘅 ID
 * （drama-NN / <劇 ID>-NN），待辦「ID」格由「必須」變 ✓（Phase 3c）。
 * 冇 arcId = 新劇 finding；有 arcId = 嗰個短篇嘅新短篇 finding（用 detail.arc 對返現有短篇，同 GET /api/todos）。
 * 冇對到嘅 finding 唔係錯（idempotent）：回 { confirmed: 0 }
 */
import { ID_PATTERN } from '@903-player/catalog';
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';
import { getEntry } from '../catalog/store';
import { errorResponse, readJsonObject, type Json } from '../content/http';
import { openFindings, type FindingRow } from './findings';
import { arcOfFinding } from './todos';

export const confirmIdRoutes = new Hono<AppEnv>();

interface ConfirmTarget {
    dramaId: string;
    arcId?: string | undefined;
}

const targetOfBody = (body: Json | undefined): ConfirmTarget | undefined => {
    const dramaId = body?.dramaId;
    const arcId = body?.arcId;
    if (typeof dramaId !== 'string' || !ID_PATTERN.test(dramaId)) return undefined;
    if (arcId !== undefined && (typeof arcId !== 'string' || arcId === '')) return undefined;
    return { dramaId, arcId };
};

const matches = (finding: FindingRow, target: ConfirmTarget, definition: Json): boolean => {
    if (finding.drama_id !== target.dramaId) return false;
    if (target.arcId === undefined) return finding.kind === 'newDrama';
    if (finding.kind !== 'newArc') return false;
    const arc = arcOfFinding(finding, definition);
    return (arc ? arc.id : finding.arc_id) === target.arcId;
};

const confirmedDetail = (finding: FindingRow): string =>
    JSON.stringify({ ...(JSON.parse(finding.detail) as Json), idConfirmed: true });

confirmIdRoutes.post('/todos/confirm-id', async (c) => {
    const target = targetOfBody(await readJsonObject(c));
    if (!target)
        return errorResponse(
            c,
            HTTP_STATUS.badRequest,
            'body must be { dramaId, arcId? } with a valid drama id',
        );
    const entry = await getEntry(c.env.DB, 'dramas', target.dramaId);
    if (!entry) return errorResponse(c, HTTP_STATUS.notFound, 'no such entry');
    const definition = JSON.parse(entry.definition) as Json;
    const found = (await openFindings(c.env.DB)).filter((f) => matches(f, target, definition));
    if (found.length > 0)
        await c.env.DB.batch(
            found.map((finding) =>
                c.env.DB.prepare(
                    'UPDATE scan_findings SET detail = ? WHERE id = ? AND resolved_publish_id IS NULL',
                ).bind(confirmedDetail(finding), finding.id),
            ),
        );
    return c.json({ confirmed: found.length });
});
