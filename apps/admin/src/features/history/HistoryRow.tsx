/*
 * 上下架記錄一行：版本資訊置頂（#id / 時間 / admin 分行）；變更 tag / 縮圖 / 名 / 狀態對齊，名欄用晒餘下闊度（3c）；
 * 版本欄由上至下：#N → 使用中 / 失敗 pill → 時間 → admin → 還原掣（冇「操作」欄，變更欄用晒餘下闊度）；
 * 使用中綠邊、失敗紅邊 + 原因
 * Design Origin: mockup: _mockups_/admin/index.html#s8（.hist-row）
 */
import { Undo2 } from 'lucide-react';
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

interface HistoryRowProps {
    row: PublishSummary;
    /** 失敗時播放器仍然用緊嘅版本 */
    servingId: number | undefined;
    entries: readonly LoadedEntry[];
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

/** 版本欄最底：「還原」（使用中 / 失敗嘅冇） */
function Action({ row, onRollback }: Pick<HistoryRowProps, 'row' | 'onRollback'>) {
    if (row.current || row.status !== 'ok') return null;
    return (
        <button
            type="button"
            onClick={() => onRollback(row.id)}
            aria-label={t('history.rollbackTo', { id: row.id })}
        >
            <Undo2 aria-hidden="true" />
            {t('history.rollback')}
        </button>
    );
}

function ChangeLine({ item, entries }: { item: ChangeItem; entries: readonly LoadedEntry[] }) {
    const status = itemStatusOf(item, entries);
    return (
        <>
            <span className="kind">{kindLabel(item.kind)}</span>
            {item.kind === 'rollback' ? <span /> : <Thumb url={thumbOf(entries, item)} size="sm" />}
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

export function HistoryRow({ row, servingId, entries, onRollback, onRedeploy }: HistoryRowProps) {
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
                <Action row={row} onRollback={onRollback} />
                <DeployCell row={row} onRedeploy={onRedeploy} />
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
