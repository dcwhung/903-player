/*
 * 撳「發佈」：POST /api/publish { selection, fingerprint } → 成功：刷新 + 清更新頁選擇 + 去上下架記錄
 * （skipped 唔係空 = 揀咗但已變未完成，toast 講明）；409 → 擋住清單；422 未知 key → 頁面過時；
 * 412（AU-021）→ 內容喺確認頁之後變咗、冇發佈：重讀摘要（onChanged），用戶睇過再撳；其他 → 訊息
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublishBlockedError, VersionConflictError } from '../../api/client';
import { isStaleSelection, publish, type PublishResult } from '../../api/publishEndpoints';
import type { PublishSelection } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { useToast } from '../../ui/Toast';
import { errorMessage } from '../../api/errorMessage';
import { usePublishSelection } from './PublishSelection';

export type PublishState =
    /** changed = 412：內容變咗、冇發佈，摘要已重讀 */
    | { status: 'idle' | 'publishing' | 'stale' | 'changed' }
    | { status: 'blocked'; missing: string[] }
    | { status: 'failed' | 'unchanged'; message: string };

/** 揀咗但已變未完成（server 自動剔走）都講埋 */
const publishedMessage = ({ publish: row, selection }: PublishResult): string => {
    const skipped = selection?.skipped.length ?? 0;
    return skipped > 0
        ? t('publish.publishedSkipped', { id: row.id, count: skipped })
        : t('publish.published', { id: row.id });
};

/** 發佈失敗 → 頁面狀態 */
const failureOf = (error: unknown): PublishState => {
    if (error instanceof PublishBlockedError) return { status: 'blocked', missing: error.missing };
    if (isStaleSelection(error)) return { status: 'stale' };
    if (error instanceof VersionConflictError) return { status: 'changed' };
    return { status: 'failed', message: t('publish.failed', { error: errorMessage(error) }) };
};

export interface PublishGuard {
    /** 而家顯示緊嗰份摘要嘅 fingerprint（舊 API 冇） */
    fingerprint: string | undefined;
    /** 412：重讀摘要（完成先當 changed，期間掣照灰） */
    onChanged: () => Promise<unknown>;
}

export const usePublish = (
    selection: PublishSelection | undefined,
    { fingerprint, onChanged }: PublishGuard,
) => {
    const [state, setState] = useState<PublishState>({ status: 'idle' });
    const { refresh } = useAdminData();
    const { reset } = usePublishSelection();
    const navigate = useNavigate();
    const toast = useToast();
    const run = async () => {
        setState({ status: 'publishing' });
        try {
            const result = await publish(selection, fingerprint);
            await refresh();
            if (result.unchanged)
                return setState({ status: 'unchanged', message: t('publish.unchanged') });
            reset();
            toast(publishedMessage(result));
            navigate('/history');
        } catch (error) {
            const failure = failureOf(error);
            // 重讀完先當 changed：期間仲係 publishing，掣照灰
            if (failure.status === 'changed') await onChanged();
            setState(failure);
        }
    };
    return { state, run };
};
