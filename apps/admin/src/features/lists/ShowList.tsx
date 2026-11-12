/*
 * 節目列表：Design Origin: mockup: _mockups_/admin/index.html#s2c
 * 兩欄（名稱、狀態）；meta = 播出日 +（播放時間）；成行撳入編輯頁（3c）；拖 ⠿ 排序（放手即存）；
 * 已下架固定排最底、唔可以拖；底下圖例
 */
import { formatAirTime } from '@903-player/catalog';
import { useNavigate } from 'react-router-dom';
import type { LoadedEntry } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { changeFlagsOf, groupEntries, type ChangeFlags } from '../../model/listModel';
import { Pill } from '../../ui/Pill';
import type { SortableRender } from '../../ui/SortableList';
import { airDaysOf as airDaysIn, airTimeOf } from '../shows/showModel';
import { EntryName } from './EntryName';
import { legendOf } from './legendModel';
import { ListLegend } from './ListLegend';
import { rowClickTo } from './rowClick';
import { ListTitle } from './ListTitle';
import { LockedHandle } from './LockedHandle';
import { UnpublishedNote } from './UnpublishedNote';
import { SortableEntries } from './SortableEntries';

/** 「星期一至五（15:00 - 16:30）」；冇播放時間就淨係星期幾 */
const airMetaOf = (entry: LoadedEntry) =>
    formatAirTime(airDaysIn(entry.definition), airTimeOf(entry.definition));

function ShowRow({
    entry,
    flags,
    sortable,
}: {
    entry: LoadedEntry;
    flags: ChangeFlags;
    sortable?: SortableRender;
}) {
    const off = entry.definition.enabled === false;
    const navigate = useNavigate();
    return (
        <li
            ref={sortable?.setNodeRef}
            style={sortable?.style}
            className={`row clickable${sortable?.isDragging ? ' is-dragging' : ''}`}
            onClick={rowClickTo(() => navigate(`/shows/${entry.id}`))}
        >
            {sortable ? sortable.handle : <LockedHandle />}
            <EntryName entry={entry} flags={flags} meta={airMetaOf(entry)} />
            <div className="pills">
                <Pill tone={off ? 'bad' : 'ok'} dot>
                    {off ? t('status.off') : t('status.showLive')}
                </Pill>
            </div>
        </li>
    );
}

export function ShowList() {
    const { entries, changes } = useAdminData();
    const navigate = useNavigate();
    const flags = changeFlagsOf(changes.data?.changes);
    const shows = (entries.data ?? []).filter((e) => e.kind === 'shows');
    const groups = groupEntries(shows);
    // 節目冇掃描 draft：draft = 新節目圖未齊（下架先存到），同已下架一齊列
    const unlisted = [...groups.pending, ...groups.unlisted];
    return (
        <>
            <ListTitle
                title={t('list.shows')}
                addLabel={t('list.addShow')}
                onAdd={() => navigate('/shows/new')}
            />
            <UnpublishedNote />
            <div className="card flush">
                <div className="list-head" aria-hidden="true">
                    <span />
                    <span>{t('list.colName')}</span>
                    <span>{t('list.colStatus')}</span>
                </div>
                <SortableEntries
                    kind="shows"
                    label={t('list.shows')}
                    entries={groups.listed}
                    renderRow={(entry, sortable) => (
                        <ShowRow key={entry.id} entry={entry} flags={flags} sortable={sortable} />
                    )}
                />
                {unlisted.length > 0 && (
                    <>
                        <div className="section-divider">
                            {t('list.unlisted', { count: unlisted.length })}
                        </div>
                        <ol className="list disabled">
                            {unlisted.map((entry) => (
                                <ShowRow key={entry.id} entry={entry} flags={flags} />
                            ))}
                        </ol>
                    </>
                )}
            </div>
            <ListLegend legend={legendOf(shows, flags)} />
        </>
    );
}
