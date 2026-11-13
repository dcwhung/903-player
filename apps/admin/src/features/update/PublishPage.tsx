/*
 * 更新 · 確認發佈：Design Origin: mockup: _mockups_/admin/index.html#u3（結構）+
 * mockup: _mockups_/admin-style/index.html#a（漸變統計卡）+
 * mockup: _mockups_/admin-selective-publish/index.html#b（選擇發佈：今次發佈、未完成、重新部署提示）。
 * 409 → 擋住清單（#s9）；驗證錯誤 / 配色警告（admin-phase4 #f）；422 未知 key → 頁面過時（重新載入）
 */
import { useEffect } from 'react';
import type { ChangesResponse } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { PublishActions } from './PublishActions';
import { PublishHead } from './PublishHead';
import { SelectionCard } from './SelectionCard';
import { StaleNotice } from './StaleNotice';
import { Stepper } from './Stepper';
import { Timeline } from './Timeline';
import { usePublish } from './usePublish';
import { usePublishTarget, useSelectedChanges } from './useSelectedChanges';

const emptyText = (loading: boolean, bannerChanged: boolean, brandingChanged: boolean) => {
    if (loading) return t('app.loading');
    if (brandingChanged) return t('publish.brandingOnly');
    return t(bannerChanged ? 'publish.bannerOnly' : 'publish.nothing');
};

/** 首頁 Banner / App 外觀（草稿）改咗都算有嘢發佈；照選擇計會 unchanged 就唔准 */
const canPublishOf = (data: ChangesResponse | undefined): boolean => {
    if (!data?.validation.ok || data.unchanged === true) return false;
    return (
        data.changes.items.length > 0 ||
        data.bannerChanged === true ||
        data.brandingChanged === true
    );
};

export function PublishPage() {
    const { changes, entries, todos } = useAdminData();
    const { reload } = changes;
    useEffect(() => void reload(), [reload]);
    const selection = usePublishTarget();
    const selected = useSelectedChanges(selection);
    const { state, run } = usePublish(selection);
    const data = selected.data;
    const stale = selected.stale || state.status === 'stale';
    const loadError = selected.error && !selected.stale ? selected.error : undefined;
    return (
        <>
            <div className="title-row">
                <h1>{t('update.title')}</h1>
            </div>
            <Stepper current={3} />
            {stale && <StaleNotice />}
            {loadError && (
                <p className="note bad">{t('app.loadFailed', { error: loadError.message })}</p>
            )}
            {data && <PublishHead data={data} entries={entries.data ?? []} />}
            {data && selection && (
                <SelectionCard data={data} selection={selection} rows={todos.data?.rows ?? []} />
            )}
            {/* 過時：唔顯示「沒有需要發佈的變更」，免得誤會 */}
            {!stale && (
                <div className="card">
                    {data && data.changes.timeline.length > 0 ? (
                        <Timeline groups={data.changes.timeline} entries={entries.data ?? []} />
                    ) : (
                        <p className="muted">
                            {emptyText(
                                selected.loading,
                                data?.bannerChanged === true,
                                data?.brandingChanged === true,
                            )}
                        </p>
                    )}
                </div>
            )}
            <PublishActions
                state={state}
                canPublish={canPublishOf(data) && !selected.loading && !stale}
                onPublish={() => void run()}
            />
        </>
    );
}
