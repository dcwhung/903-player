/*
 * 發佈 / 部署記錄每行嘅部署狀態（Q5）：publishes.deploy（none / skipped / triggered / failed）+
 * triggered 時 poll GET /api/publishes/:id/deploy 嘅 GitHub Actions run 狀態
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#d
 */
import type { DeployRequest, DeployStatus, PublishSummary } from '../../api/types';
import type { MessageKey } from '../../i18n/t';
import type { Tone } from '../../model/status';

/** poll 間隔 / 次數上限：唔好無止境打 GitHub API */
export const DEPLOY_POLL_MS = 5000;
export const DEPLOY_POLL_MAX = 60;

export interface DeployView {
    labelKey: MessageKey;
    tone: Tone;
    /** 仲要 poll（未有結論） */
    polling: boolean;
    /** 可以重新部署（失敗 / unknown） */
    canRedeploy: boolean;
}

const RUN_VIEW: Record<DeployStatus['status'], DeployView> = {
    queued: { labelKey: 'history.deployRunning', tone: 'info', polling: true, canRedeploy: false },
    in_progress: {
        labelKey: 'history.deployRunning',
        tone: 'info',
        polling: true,
        canRedeploy: false,
    },
    success: {
        labelKey: 'history.deploySuccess',
        tone: 'ok',
        polling: false,
        canRedeploy: false,
    },
    failure: { labelKey: 'history.deployFailed', tone: 'bad', polling: false, canRedeploy: true },
    unknown: {
        labelKey: 'history.deployUnknown',
        tone: 'none',
        polling: false,
        canRedeploy: true,
    },
};

/** triggered 之前（未 poll）先當部署中 */
const TRIGGERED: DeployView = {
    labelKey: 'history.deployRunning',
    tone: 'info',
    polling: true,
    canRedeploy: false,
};

/** deploy = none / skipped / failed：唔使 poll */
const REQUEST_VIEW: Partial<Record<DeployRequest, DeployView>> = {
    none: { labelKey: 'history.deployNone', tone: 'none', polling: false, canRedeploy: false },
    skipped: {
        labelKey: 'history.deploySkipped',
        tone: 'none',
        polling: false,
        canRedeploy: false,
    },
    failed: { labelKey: 'history.deployFailed', tone: 'bad', polling: false, canRedeploy: true },
};

/** triggered 行先要 poll（status 未返就當部署中） */
export const isTriggered = (row: PublishSummary) =>
    row.status === 'ok' && row.deploy === 'triggered';

/** 已有 run 狀態（poll 返嚟）就用佢，否則用 publishes.deploy 決定 */
export const deployView = (
    deploy: DeployRequest | undefined,
    status: DeployStatus | undefined,
): DeployView | null => {
    if (deploy === undefined) return null;
    if (deploy === 'triggered') return status ? RUN_VIEW[status.status] : TRIGGERED;
    return REQUEST_VIEW[deploy] ?? null;
};
