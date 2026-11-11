/* 畫面顯示用嘅錯誤文字：session 過期（401）用中文講清楚，其他照 server / Error 訊息 */
import { t } from '../i18n/t';
import { UnauthorizedError } from './client';

export const errorMessage = (error: unknown): string => {
    if (error instanceof UnauthorizedError) return t('editor.sessionExpired');
    return error instanceof Error ? error.message : String(error);
};
