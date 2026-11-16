/*
 * 發佈 / 部署記錄每行嘅部署狀態（Q5）：pill（未設定自動部署 / 部署中 / 已部署 / 部署失敗；無需部署乜都唔出）+
 * 重新部署。部署中 / 失敗 / 不明嘅 pill 本身連去 GitHub run 頁（新分頁）；已部署淨係 pill。
 * triggered 行會 poll，離開頁面停
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
    const status = useDeployStatus(row.id, isTriggered(row), row.deployRequestedAt ?? null);
    const view = deployView(row.deploy, status);
    if (!view) return null;
    const label = t(view.labelKey);
    const pill = <Pill tone={view.tone === 'none' ? undefined : view.tone}>{label}</Pill>;
    const runUrl = view.linksRun ? status?.url : undefined;
    return (
        <span className="deploy">
            {runUrl ? (
                <a
                    className="pill-link"
                    href={runUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('history.deployRunLabel', { status: label, id: row.id })}
                >
                    {pill}
                </a>
            ) : (
                pill
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
