/*
 * 畫面顯示用嘅錯誤文字：session 過期（401）、改劇 ID 後短篇 ID 重複（409 + arcId，W-711）用中文講清楚，
 * 其他照 server / Error 訊息
 */
import { t } from '../i18n/t';
import { ApiError, UnauthorizedError } from './client';

const CONFLICT = 409;

export const errorMessage = (error: unknown): string => {
    if (error instanceof UnauthorizedError) return t('editor.sessionExpired');
    if (
        error instanceof ApiError &&
        error.status === CONFLICT &&
        typeof error.body.arcId === 'string'
    )
        return t('editor.arcIdDuplicate', { id: error.body.arcId });
    return error instanceof Error ? error.message : String(error);
};
