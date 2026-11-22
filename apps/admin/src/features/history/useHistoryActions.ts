/*
 * 發佈 / 部署頁嘅動作（還原、重新部署）：一次只跑一個，進行中 busy = true（AU-025）。
 * 還原：成功 toast、失敗喺頁面顯示原因；兩者之後都重讀記錄 + admin 資料
 */
import { useCallback, useRef, useState } from 'react';
import { redeploy } from '../../api/brandingEndpoints';
import { rollback } from '../../api/endpoints';
import { errorMessage } from '../../api/errorMessage';
import { t } from '../../i18n/t';
import { useToast } from '../../ui/Toast';

/**
 * 一次只跑一個動作：ref 即時擋住（state 未 render 之前嘅連撳），busy state 畀掣 disabled
 */
const useSingleAction = () => {
    const runningRef = useRef(false);
    const [busy, setBusy] = useState(false);
    const run = useCallback(async (action: () => Promise<void>) => {
        if (runningRef.current) return;
        runningRef.current = true;
        setBusy(true);
        try {
            await action();
        } finally {
            runningRef.current = false;
            setBusy(false);
        }
    }, []);
    return { busy, run };
};

interface HistoryReloads {
    /** 重讀發佈記錄 */
    reloadPublishes: () => Promise<unknown>;
    /** 重讀 admin 共用資料（待辦 / entry / 變更） */
    refresh: () => Promise<void>;
}

export const useHistoryActions = ({ reloadPublishes, refresh }: HistoryReloads) => {
    const toast = useToast();
    const { busy, run } = useSingleAction();
    const [rollbackError, setRollbackError] = useState<string>();
    const rollbackTo = (id: number) =>
        run(async () => {
            setRollbackError(undefined);
            try {
                const { unchanged } = await rollback(id);
                toast(unchanged ? t('publish.unchanged') : t('history.rolledBack', { id }));
            } catch (error) {
                setRollbackError(t('history.rollbackFailed', { error: errorMessage(error) }));
            }
            await Promise.all([reloadPublishes(), refresh()]);
        });
    const redeployTo = (id: number) =>
        run(async () => {
            try {
                await redeploy(id);
                toast(t('history.redeployed', { id }));
                await reloadPublishes();
            } catch (error) {
                toast(t('history.redeployFailed', { error: errorMessage(error) }));
            }
        });
    return { busy, rollbackError, rollbackTo, redeployTo };
};
