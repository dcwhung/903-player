/*
 * 部署狀態（GET /api/publishes/:id/deploy）：查 GitHub Actions deploy.yml 喺 deployRequestedAt 之後嘅
 * repository_dispatch run。Vercel hook 冇狀態 API，唔查。
 * 冇 token / 未觸發 / GitHub 答唔到 = unknown；觸發本身失敗 = failure；未有 run（GitHub 未排到）= queued
 */
import type { PublishRow } from '../catalog/store';
import {
    DEPLOY_RUNS_EVENT,
    DEPLOY_RUNS_PER_PAGE,
    DEPLOY_RUNS_URL,
    DEPLOY_TIMEOUT_MS,
    GITHUB_HEADERS,
} from './config';

export type DeployRunStatus = 'queued' | 'in_progress' | 'success' | 'failure' | 'unknown';

export interface DeployStatus {
    status: DeployRunStatus;
    /** GitHub Actions run 頁（冇 run = null） */
    url: string | null;
}

interface WorkflowRun {
    status?: string;
    conclusion?: string | null;
    html_url?: string;
}

const UNKNOWN: DeployStatus = { status: 'unknown', url: null };
/** GitHub created filter 只到秒：ISO 去咗毫秒 */
const ISO_SECONDS_LENGTH = 19;

const runsUrl = (requestedAt: string): string => {
    const query = new URLSearchParams({
        event: DEPLOY_RUNS_EVENT,
        created: `>=${requestedAt.slice(0, ISO_SECONDS_LENGTH)}Z`,
        per_page: String(DEPLOY_RUNS_PER_PAGE),
    });
    return `${DEPLOY_RUNS_URL}?${query.toString()}`;
};

/** 新到舊；status 唔係 2xx throw */
const fetchRuns = async (token: string, requestedAt: string): Promise<WorkflowRun[]> => {
    const response = await fetch(runsUrl(requestedAt), {
        headers: { ...GITHUB_HEADERS, authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`GitHub runs answered ${response.status}`);
    const body = (await response.json()) as { workflow_runs?: WorkflowRun[] };
    return Array.isArray(body.workflow_runs) ? body.workflow_runs : [];
};

const statusOf = ({ status, conclusion }: WorkflowRun): DeployRunStatus => {
    if (status === 'completed') return conclusion === 'success' ? 'success' : 'failure';
    return status === 'in_progress' ? 'in_progress' : 'queued';
};

export const deployStatus = async (
    token: string | undefined,
    publish: PublishRow,
): Promise<DeployStatus> => {
    if (publish.deploy === 'failed') return { status: 'failure', url: null };
    const requestedAt = publish.deploy_requested_at;
    if (publish.deploy !== 'triggered' || !token || !requestedAt) return UNKNOWN;
    try {
        // 觸發之後最早嗰個 run 先係今次（之後嘅可能係下一次 publish / 重新部署）
        const run = (await fetchRuns(token, requestedAt)).at(-1);
        return run
            ? { status: statusOf(run), url: run.html_url ?? null }
            : { status: 'queued', url: null };
    } catch (error) {
        console.error(`publish ${publish.id}: could not read the deploy status`, error);
        return UNKNOWN;
    }
};
