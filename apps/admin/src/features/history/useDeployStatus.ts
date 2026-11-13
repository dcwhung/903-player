/* triggered 行：隔 DEPLOY_POLL_MS poll 一次部署狀態，有結論 / 到上限 / 離開頁面就停 */
import { useEffect, useRef, useState } from 'react';
import { getDeployStatus } from '../../api/brandingEndpoints';
import type { DeployStatus } from '../../api/types';
import { DEPLOY_POLL_MAX, DEPLOY_POLL_MS } from './deployModel';

export const useDeployStatus = (id: number, enabled: boolean) => {
    const [status, setStatus] = useState<DeployStatus>();
    const tries = useRef(0);
    useEffect(() => {
        if (!enabled) return undefined;
        let live = true;
        let timer: ReturnType<typeof setTimeout>;
        const poll = async () => {
            tries.current += 1;
            const next = await getDeployStatus(id).catch(() => undefined);
            if (!live) return;
            if (next) setStatus(next);
            const done = next && next.status !== 'queued' && next.status !== 'in_progress';
            if (!done && tries.current < DEPLOY_POLL_MAX)
                timer = setTimeout(() => void poll(), DEPLOY_POLL_MS);
        };
        void poll();
        return () => {
            live = false;
            clearTimeout(timer);
        };
    }, [id, enabled]);
    return status;
};
