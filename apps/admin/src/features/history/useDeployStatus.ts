/*
 * triggered 行：隔 DEPLOY_POLL_MS poll 一次部署狀態，有結論 / 到上限 / 離開頁面就停。
 * W-737：每次觸發（requestedAt 變，例如重新部署）都由頭 poll —— 次數重新計，舊結果唔再顯示。
 * 結果連住觸發 key 存：key 唔對就當未有結果（effect 入面唔使同步 setState 清走）。
 * S-967：到上限仲未有結論 → unknown（畫面顯示狀態不明 + 重新部署），保留最後一個 run 連結
 */
import { useEffect, useState } from 'react';
import { getDeployStatus } from '../../api/brandingEndpoints';
import type { DeployStatus } from '../../api/types';
import { DEPLOY_POLL_MAX, DEPLOY_POLL_MS } from './deployModel';

interface KeyedStatus {
    key: string;
    status: DeployStatus;
}

const isRunning = (status: DeployStatus | undefined) =>
    !status || status.status === 'queued' || status.status === 'in_progress';

export const useDeployStatus = (id: number, enabled: boolean, requestedAt: string | null) => {
    const key = `${id}@${requestedAt ?? ''}`;
    const [result, setResult] = useState<KeyedStatus>();
    useEffect(() => {
        if (!enabled) return undefined;
        let live = true;
        // effect 內 local counter：重新觸發時自然歸零（ref 會跨觸發累積）
        let tries = 0;
        let timer: ReturnType<typeof setTimeout>;
        let lastUrl: string | null = null;
        const poll = async () => {
            tries += 1;
            const next = await getDeployStatus(id).catch(() => undefined);
            if (!live) return;
            if (next) setResult({ key, status: next });
            lastUrl = next?.url ?? lastUrl;
            if (!isRunning(next)) return;
            if (tries < DEPLOY_POLL_MAX) timer = setTimeout(() => void poll(), DEPLOY_POLL_MS);
            else setResult({ key, status: { status: 'unknown', url: lastUrl } });
        };
        void poll();
        return () => {
            live = false;
            clearTimeout(timer);
        };
    }, [id, enabled, key]);
    return result?.key === key ? result.status : undefined;
};
