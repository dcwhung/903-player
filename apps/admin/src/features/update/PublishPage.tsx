/*
 * 更新 · 確認發佈：Design Origin: mockup: _mockups_/admin/index.html#u3（結構）+
 * mockup: _mockups_/admin-style/index.html#a（漸變統計卡）+
 * mockup: _mockups_/admin-selective-publish/index.html#b（選擇發佈）+
 * mockup: _mockups_/admin-publish-summary/index.html（B v2 方案 1：四格數字 → 時間線 → 發佈；
 * App 外觀卡寫重新部署說明，未完成項目排時間線最尾「不會在本次發佈」）。
 * 409 → 擋住清單（#s9）；驗證錯誤 / 配色警告（admin-phase4 #f）；422 未知 key → 頁面過時（重新載入）
 */
import { useEffect } from 'react';
import type { ChangesResponse, LoadedEntry, PublishSelection, TodoRow } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { PublishActions } from './PublishActions';
import { PublishHead } from './PublishHead';
import { publishedAppearance } from './selectionModel';
import { skippedRows } from './skipModel';
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

interface ChangesCardProps {
    data: ChangesResponse | undefined;
    selection: PublishSelection | undefined;
    entries: readonly LoadedEntry[];
    skipped: readonly TodoRow[];
    loading: boolean;
}

/**
 * 時間線（內容 + 今次發佈嘅 App 外觀 + 不會在本次發佈）；冇內容就講只改咗 Banner / App 外觀
 * （或者冇嘢發佈），有未完成項目照出「不會在本次發佈」
 */
function ChangesCard({ data, selection, entries, skipped, loading }: ChangesCardProps) {
    const appearance = data && selection ? publishedAppearance(data, selection) : [];
    const hasContent = (data?.changes.timeline.length ?? 0) > 0 || appearance.length > 0;
    return (
        <section className="card" aria-label={t('publish.timelineLabel')}>
            {!(data && hasContent) && (
                <p className="muted">
                    {emptyText(
                        loading,
                        data?.bannerChanged === true,
                        data?.brandingChanged === true,
                    )}
                </p>
            )}
            {data && (hasContent || skipped.length > 0) && (
                <Timeline
                    groups={data.changes.timeline}
                    entries={entries}
                    appearance={appearance}
                    skipped={skipped}
                />
            )}
        </section>
    );
}

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
            {/* 過時：唔顯示「沒有需要發佈的變更」，免得誤會 */}
            {!stale && (
                <ChangesCard
                    data={data}
                    selection={selection}
                    entries={entries.data ?? []}
                    skipped={skippedRows(todos.data?.rows ?? [], data)}
                    loading={selected.loading}
                />
            )}
            <PublishActions
                state={state}
                canPublish={canPublishOf(data) && !selected.loading && !stale}
                onPublish={() => void run()}
            />
        </>
    );
}
