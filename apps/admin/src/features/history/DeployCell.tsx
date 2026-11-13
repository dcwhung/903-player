/*
 * 發佈 / 部署記錄每行嘅部署狀態（Q5）：pill（無需部署 / 未設定自動部署 / 部署中 / 已部署 / 部署失敗）+
 * GitHub 連結 + 重新部署。triggered 行會 poll，離開頁面停
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#d
 */
import type { PublishSummary } from '../../api/types';
import { t } from '../../i18n/t';
import { Pill } from '../../ui/Pill';
import { deployView, isTriggered } from './deployModel';
import { useDeployStatus } from './useDeployStatus';

interface DeployCellProps {
    row: PublishSummary;
    onRedeploy: (id: number) => void;
}

export function DeployCell({ row, onRedeploy }: DeployCellProps) {
    const status = useDeployStatus(row.id, isTriggered(row));
    const view = deployView(row.deploy, status);
    if (!view) return null;
    return (
        <span className="deploy">
            <Pill tone={view.tone === 'none' ? undefined : view.tone}>{t(view.labelKey)}</Pill>
            {status?.url && (
                <a
                    href={status.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('history.githubLabel', { id: row.id })}
                >
                    {t('history.github')}
                </a>
            )}
            {view.canRedeploy && (
                <button
                    type="button"
                    className="link-btn"
                    aria-label={t('history.redeployLabel', { id: row.id })}
                    onClick={() => onRedeploy(row.id)}
                >
                    {t('history.redeploy')}
                </button>
            )}
        </span>
    );
}
