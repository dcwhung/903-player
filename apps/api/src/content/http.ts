/* 內容 API 共用：path 參數、JSON body、錯誤回應 */
import { ID_PATTERN, type CatalogKind } from '@903-player/catalog';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv } from '../app';
import { HTTP_STATUS } from '../config';

const KINDS: readonly string[] = ['shows', 'dramas'] satisfies readonly CatalogKind[];

export type Json = Record<string, unknown>;

export const isRecord = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** kind / id 合規先回（id 同 folder 名一樣：細楷英數同連字號） */
export const targetOf = (c: Context<AppEnv>): { kind: CatalogKind; id: string } | undefined => {
    // /dramas/:id/… 冇 :kind
    const { kind = 'dramas', id } = c.req.param() as { kind?: string; id?: string };
    if (kind === undefined || !KINDS.includes(kind) || id === undefined || !ID_PATTERN.test(id))
        return undefined;
    return { kind: kind as CatalogKind, id };
};

/** body 唔係 JSON object → undefined */
export const readJsonObject = async (c: Context<AppEnv>): Promise<Json | undefined> => {
    try {
        const body: unknown = await c.req.json();
        return isRecord(body) ? body : undefined;
    } catch {
        return undefined;
    }
};

export const errorResponse = (
    c: Context<AppEnv>,
    status: ContentfulStatusCode,
    error: string,
    extra: Json = {},
) => c.json({ error, ...extra }, status);

export const badTarget = (c: Context<AppEnv>) =>
    errorResponse(
        c,
        HTTP_STATUS.badRequest,
        'kind must be shows / dramas and id must match the folder rule',
    );

export const preconditionFailed = (c: Context<AppEnv>) =>
    errorResponse(
        c,
        HTTP_STATUS.preconditionFailed,
        'entry changed (or exists) — reload and retry',
    );
