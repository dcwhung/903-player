/*
 * 上下架記錄一行：版本資訊置頂（#id / 時間 / admin 分行）；變更 tag / 縮圖 / 名 / 狀態對齊，名欄用晒餘下闊度（3c）；
 * 版本欄由上至下：#N → 使用中 / 失敗 pill → 時間 → admin → 還原掣（冇「操作」欄，變更欄用晒餘下闊度）；
 * 使用中綠邊、失敗紅邊 + 原因
 * Design Origin: mockup: _mockups_/admin/index.html#s8（.hist-row）
 */
import type { ChangeItem } from '@903-player/catalog';
import type { LoadedEntry, PublishSummary } from '../../api/types';
import { t } from '../../i18n/t';
import { stampOf } from '../../model/dates';
import { thumbOf } from '../../model/thumbs';
import { Pill } from '../../ui/Pill';
import { Thumb } from '../../ui/Thumb';
import { kindLabel } from '../update/timelineModel';
import {
    bannerChangedOf,
    brandingChangedOf,
    contentChangedOf,
    historyName,
    itemStatusOf,
} from './historyModel';
import { DeployCell } from './DeployCell';
import { RollbackButton } from './RollbackButton';

interface HistoryRowProps {
    row: PublishSummary;
    /** 失敗時播放器仍然用緊嘅版本 */
    servingId: number | undefined;
    entries: readonly LoadedEntry[];
    /** 有還原 / 重新部署進行中：動作掣停用（AU-025） */
    busy?: boolean;
    onRollback: (id: number) => void;
    onRedeploy: (id: number) => void;
}

/** 版本欄：使用中 / 失敗 pill（成功嘅舊版本冇 pill） */
function VersionPill({ row }: { row: PublishSummary }) {
    if (row.current)
        return (
            <Pill tone="ok" dot>
                {t('status.current')}
            </Pill>
        );
    if (row.status !== 'ok')
        return (
            <Pill tone="bad" dot>
                {t('status.failed')}
            </Pill>
        );
    return null;
}

/** 還原 / 排序（#6）冇 entry：冇縮圖 */
const NO_THUMB: ReadonlySet<ChangeItem['kind']> = new Set(['rollback', 'reorder']);

function ChangeLine({ item, entries }: { item: ChangeItem; entries: readonly LoadedEntry[] }) {
    const status = itemStatusOf(item, entries);
    return (
        <>
            <span className="kind">{kindLabel(item.kind)}</span>
            {NO_THUMB.has(item.kind) ? <span /> : <Thumb url={thumbOf(entries, item)} size="sm" />}
            <span className="name">{historyName(item)}</span>
            <span>
                {status && (
                    <Pill tone={status.tone} dot={status.tone !== 'none'}>
                        {status.text}
                    </Pill>
                )}
            </span>
        </>
    );
}

/**
 * 換咗首頁 Banner（api 0.8.1 bannerChanged）/ 改咗 App 外觀（api 0.9.0 brandingChanged）：
 * 同變更行一樣嘅四欄，冇縮圖、冇狀態
 */
function ExtraLine({ name }: { name: string }) {
    return (
        <>
            <span className="kind">{t('history.bannerKind')}</span>
            <span />
            <span className="name">{name}</span>
            <span />
        </>
    );
}

/** 失敗原因；成功就「N 節目 · N 劇 · N 集」（只限改咗節目 / 劇內容，見 contentChangedOf） */
function RowMeta({ row, servingId }: Pick<HistoryRowProps, 'row' | 'servingId'>) {
    if (row.status !== 'ok')
        return (
            <span className="meta err">
                {t('history.failed', { error: row.error ?? '', id: servingId ?? '–' })}
            </span>
        );
    if (!contentChangedOf(row.changes)) return null;
    const counts = { shows: row.showCount, dramas: row.dramaCount, episodes: row.episodeCount };
    return <span className="meta">{t('history.stats', counts)}</span>;
}

export function HistoryRow({
    row,
    servingId,
    entries,
    busy = false,
    onRollback,
    onRedeploy,
}: HistoryRowProps) {
    const failed = row.status !== 'ok';
    const items = row.changes?.items ?? [];
    const bannerChanged = bannerChangedOf(row.changes);
    const brandingChanged = brandingChangedOf(row.changes);
    return (
        <div
            className={`hist-row${row.current ? ' current' : ''}${failed ? ' failed' : ''}`}
            role="row"
        >
            <span className="ver" role="cell">
                <b>#{row.id}</b>
                <span className="ver-pill-line">
                    <VersionPill row={row} />
                </span>
                <span className="meta when">{stampOf(row.createdAt)}</span>
                <span className="meta who">{row.createdBy.split('@')[0] ?? ''}</span>
                <RollbackButton row={row} busy={busy} onRollback={onRollback} />
                <DeployCell row={row} busy={busy} onRedeploy={onRedeploy} />
            </span>
            <span className="changes" role="cell">
                {items.map((item, i) => (
                    <ChangeLine key={i} item={item} entries={entries} />
                ))}
                {brandingChanged && <ExtraLine name={t('history.brandingName')} />}
                {bannerChanged && <ExtraLine name={t('history.bannerName')} />}
                {items.length === 0 && !bannerChanged && !brandingChanged && (
                    <span className="muted small">{t('history.noChanges')}</span>
                )}
                <RowMeta row={row} servingId={servingId} />
            </span>
        </div>
    );
}
