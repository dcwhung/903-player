/*
 * 撳「發佈」：POST /api/publish { selection } → 成功：刷新 + 清更新頁選擇 + 去上下架記錄
 * （skipped 唔係空 = 揀咗但已變未完成，toast 講明）；409 → 擋住清單；422 未知 key → 頁面過時；其他 → 訊息
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublishBlockedError } from '../../api/client';
import { isStaleSelection, publish, type PublishResult } from '../../api/publishEndpoints';
import type { PublishSelection } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { useToast } from '../../ui/Toast';
import { errorMessage } from '../../api/errorMessage';
import { usePublishSelection } from './PublishSelection';

export type PublishState =
    | { status: 'idle' | 'publishing' | 'stale' }
    | { status: 'blocked'; missing: string[] }
    | { status: 'failed' | 'unchanged'; message: string };

/** 揀咗但已變未完成（server 自動剔走）都講埋 */
const publishedMessage = ({ publish: row, selection }: PublishResult): string => {
    const skipped = selection?.skipped.length ?? 0;
    return skipped > 0
        ? t('publish.publishedSkipped', { id: row.id, count: skipped })
        : t('publish.published', { id: row.id });
};

export const usePublish = (selection: PublishSelection | undefined) => {
    const [state, setState] = useState<PublishState>({ status: 'idle' });
    const { refresh } = useAdminData();
    const { reset } = usePublishSelection();
    const navigate = useNavigate();
    const toast = useToast();
    const run = async () => {
        setState({ status: 'publishing' });
        try {
            const result = await publish(selection);
            await refresh();
            if (result.unchanged)
                return setState({ status: 'unchanged', message: t('publish.unchanged') });
            reset();
            toast(publishedMessage(result));
            navigate('/history');
        } catch (error) {
            if (error instanceof PublishBlockedError)
                return setState({ status: 'blocked', missing: error.missing });
            if (isStaleSelection(error)) return setState({ status: 'stale' });
            const message = errorMessage(error);
            setState({ status: 'failed', message: t('publish.failed', { error: message }) });
        }
    };
    return { state, run };
};
