/*
 * 確認還原：perform（POST …/revert；entry 帶 If-Match = etag、排序冇）→ toast「已還原<名>」→ 關框 → onDone（重讀資料）。
 * 412（其他視窗改咗）→ 關框、重讀、toast 叫再試；409 冇發佈版本 / 短篇從未發佈（S-1011）/ 短篇有排程、400、422
 * → 錯誤留喺框入面
 */
import { useState } from 'react';
import { ApiError, ValidationError, VersionConflictError } from '../../api/client';
import { errorMessage } from '../../api/errorMessage';
import { t } from '../../i18n/t';
import { useToast } from '../../ui/Toast';

const CONFLICT = 409;
/** api 0.11.0：冇發佈版本嘅 409 body.reason */
const NOT_PUBLISHED = 'notPublished';
/** api 0.11.0：短篇喺 D1 有、但最新 publish 冇嘅 409 body.reason（S-1011） */
const ARC_NOT_PUBLISHED = 'arcNotPublished';
/** S-804 排程守衛（errorMessage 已經有中文） */
const ARC_SCHEDULED = 'arcScheduled';

export const revertErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError && error.status === CONFLICT) {
        if (error.body.reason === ARC_SCHEDULED) return errorMessage(error);
        if (error.body.reason === ARC_NOT_PUBLISHED) return t('revert.arcNotPublished');
        if (error.body.reason === NOT_PUBLISHED || error.body.reason === undefined)
            return t('revert.notPublished');
    }
    const detail = error instanceof ValidationError ? error.details : errorMessage(error);
    return t('revert.failed', { error: detail });
};

interface RevertState {
    busy: boolean;
    error?: string;
}

export const useRevertAction = (onDone: () => Promise<unknown>) => {
    const toast = useToast();
    const [state, setState] = useState<RevertState>({ busy: false });
    const run = async (perform: () => Promise<unknown>, name: string, close: () => void) => {
        setState({ busy: true });
        try {
            await perform();
            toast(t('revert.done', { name }));
        } catch (error) {
            if (!(error instanceof VersionConflictError)) {
                setState({ busy: false, error: revertErrorMessage(error) });
                return;
            }
            toast(t('revert.conflict'));
        }
        setState({ busy: false });
        close();
        await onDone();
    };
    return { ...state, run, reset: () => setState({ busy: false }) };
};
