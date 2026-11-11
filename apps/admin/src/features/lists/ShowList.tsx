/*
 * 節目列表：Design Origin: mockup: _mockups_/admin/index.html#s2c
 * 兩欄（名稱、狀態）；meta = 播出日；拖 ⠿ 排序（放手即存）；已下架固定排最底、唔可以拖
 */
import { formatAirDays, type Weekday } from '@903-player/catalog';
import { useNavigate } from 'react-router-dom';
import type { LoadedEntry } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { changeFlagsOf, groupEntries, type ChangeFlags } from '../../model/listModel';
import { Pill } from '../../ui/Pill';
import type { SortableRender } from '../../ui/SortableList';
import { EntryName } from './EntryName';
import { ListTitle } from './ListTitle';
import { LockedHandle } from './LockedHandle';
import { UnpublishedNote } from './UnpublishedNote';
import { SortableEntries } from './SortableEntries';

const airDaysOf = (entry: LoadedEntry) =>
    formatAirDays(
        (Array.isArray(entry.definition.airDays) ? entry.definition.airDays : []) as Weekday[],
    );

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
    return (
        <li
            ref={sortable?.setNodeRef}
            style={sortable?.style}
            className={`row${sortable?.isDragging ? ' is-dragging' : ''}`}
        >
            {sortable ? sortable.handle : <LockedHandle />}
            <EntryName entry={entry} flags={flags} meta={airDaysOf(entry)} />
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
    const groups = groupEntries((entries.data ?? []).filter((e) => e.kind === 'shows'));
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
                {groups.unlisted.length > 0 && (
                    <>
                        <div className="section-divider">
                            {t('list.unlisted', { count: groups.unlisted.length })}
                        </div>
                        <ol className="list disabled">
                            {groups.unlisted.map((entry) => (
                                <ShowRow key={entry.id} entry={entry} flags={flags} />
                            ))}
                        </ol>
                    </>
                )}
            </div>
        </>
    );
}
