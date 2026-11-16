/*
 * 觸發重新部署：有設 secret 嘅目標（GitHub repository_dispatch、Vercel Deploy Hook）一齊 call。
 * 永遠唔 throw（publish 已經成功，部署失敗只記 'failed'）；兩個 secret 都冇 = 'skipped'
 */
import {
    DEPLOY_EVENT_TYPE,
    DEPLOY_TIMEOUT_MS,
    GITHUB_DISPATCH_URL,
    GITHUB_HEADERS,
} from './config';

/** publishes.deploy（migration 0006） */
export type DeployState = 'none' | 'triggered' | 'skipped' | 'failed';

export interface DeploySecrets {
    GITHUB_DEPLOY_TOKEN?: string;
    VERCEL_DEPLOY_HOOK_URL?: string;
}

interface Target {
    name: string;
    request: () => Promise<Response>;
}

const post = (url: string, init: RequestInit = {}) =>
    fetch(url, { ...init, method: 'POST', signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS) });

/** 有設（非空字串）嘅目標 */
const targetsOf = (secrets: DeploySecrets, publishId: number): Target[] => {
    const { GITHUB_DEPLOY_TOKEN: token, VERCEL_DEPLOY_HOOK_URL: hook } = secrets;
    const targets: Target[] = [];
    if (token)
        targets.push({
            name: 'GitHub dispatch',
            request: () =>
                post(GITHUB_DISPATCH_URL, {
                    headers: { ...GITHUB_HEADERS, authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        event_type: DEPLOY_EVENT_TYPE,
                        client_payload: { publishId },
                    }),
                }),
        });
    if (hook) targets.push({ name: 'Vercel deploy hook', request: () => post(hook) });
    return targets;
};

/** 一個目標：2xx 先算成功；其他 status / network error 只 log（唔記 token / hook URL） */
const attempt = async ({ name, request }: Target, publishId: number): Promise<boolean> => {
    try {
        const response = await request();
        if (response.ok) return true;
        console.error(`publish ${publishId}: ${name} answered ${response.status}`);
    } catch (error) {
        console.error(`publish ${publishId}: ${name} failed`, error);
    }
    return false;
};

export const triggerDeploy = async (
    secrets: DeploySecrets,
    publishId: number,
): Promise<Exclude<DeployState, 'none'>> => {
    const targets = targetsOf(secrets, publishId);
    if (targets.length === 0) return 'skipped';
    const results = await Promise.all(targets.map((target) => attempt(target, publishId)));
    return results.every(Boolean) ? 'triggered' : 'failed';
};
