/* 撳「發佈」：成功 → 刷新 + 去上下架記錄；409 → 擋住清單；其他錯誤 → 訊息 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublishBlockedError } from '../../api/client';
import { publish } from '../../api/endpoints';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { useToast } from '../../ui/Toast';

export type PublishState =
    | { status: 'idle' | 'publishing' }
    | { status: 'blocked'; missing: string[] }
    | { status: 'failed' | 'unchanged'; message: string };

export const usePublish = () => {
    const [state, setState] = useState<PublishState>({ status: 'idle' });
    const { refresh } = useAdminData();
    const navigate = useNavigate();
    const toast = useToast();
    const run = async () => {
        setState({ status: 'publishing' });
        try {
            const result = await publish();
            await refresh();
            if (result.unchanged)
                return setState({ status: 'unchanged', message: t('publish.unchanged') });
            toast(t('publish.published', { id: result.publish.id }));
            navigate('/history');
        } catch (error) {
            if (error instanceof PublishBlockedError)
                return setState({ status: 'blocked', missing: error.missing });
            const message = error instanceof Error ? error.message : String(error);
            setState({ status: 'failed', message: t('publish.failed', { error: message }) });
        }
    };
    return { state, run };
};
