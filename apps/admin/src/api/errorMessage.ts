/*
 * 畫面顯示用嘅錯誤文字：session 過期（401）、改劇 ID 後短篇 ID 重複（409 + arcId，W-711）、
 * 有排程嘅短篇改 ID（409 + reason: 'arcScheduled'，S-804）用中文講清楚，其他照 server / Error 訊息
 */
import { t } from '../i18n/t';
import { ApiError, UnauthorizedError } from './client';

const CONFLICT = 409;
/** server 擋「有排程嘅短篇改 ID」嘅 409 body.reason（api 合約，S-804） */
const ARC_SCHEDULED_REASON = 'arcScheduled';

const conflictMessage = (body: Record<string, unknown>): string | undefined => {
    if (body.reason === ARC_SCHEDULED_REASON) return t('editor.arcIdScheduled');
    if (typeof body.arcId === 'string') return t('editor.arcIdDuplicate', { id: body.arcId });
    return undefined;
};

export const errorMessage = (error: unknown): string => {
    if (error instanceof UnauthorizedError) return t('editor.sessionExpired');
    const conflict =
        error instanceof ApiError && error.status === CONFLICT
            ? conflictMessage(error.body)
            : undefined;
    if (conflict) return conflict;
    return error instanceof Error ? error.message : String(error);
};
