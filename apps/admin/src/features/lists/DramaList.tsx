/*
 * 廣播劇列表：Design Origin: mockup: _mockups_/admin/index.html#s2（+ #s2b 拖曳中）
 * 名稱 / 短篇 / 集數 / 狀態；拖 ⠿ 排序（放手即存）；待處理 / 未上架 / 已下架固定排最底、唔可以拖
 */
import { useState } from 'react';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import {
    changeFlagsOf,
    groupEntries,
    unlistedLabelOf,
    type ChangeFlags,
} from '../../model/listModel';
import type { LoadedEntry } from '../../api/types';
import { DramaRow } from './DramaRow';
import { legendOf } from './legendModel';
import { DramaListHead } from './DramaListParts';
import { ListLegend } from './ListLegend';
import { ListTitle } from './ListTitle';
import { NewDramaDialog } from './NewDramaDialog';
import { UnpublishedNote } from './UnpublishedNote';
import { SortableEntries } from './SortableEntries';

function LockedSection({
    label,
    entries,
    flags,
}: {
    label: string;
    entries: LoadedEntry[];
    flags: ChangeFlags;
}) {
    if (entries.length === 0) return null;
    return (
        <>
            <div className="section-divider">{label}</div>
            <ol className="list">
                {entries.map((entry) => (
                    <DramaRow key={entry.id} entry={entry} flags={flags} disabled />
                ))}
            </ol>
        </>
    );
}

export function DramaList() {
    const { entries, changes, rescan } = useAdminData();
    const [adding, setAdding] = useState(false);
    const flags = changeFlagsOf(changes.data?.changes);
    const dramas = (entries.data ?? []).filter((e) => e.kind === 'dramas');
    const groups = groupEntries(dramas);
    return (
        <>
            <ListTitle
                title={t('list.dramas')}
                addLabel={t('list.addDrama')}
                onAdd={() => setAdding(true)}
            />
            <UnpublishedNote />
            <div className="card flush">
                <DramaListHead />
                <SortableEntries
                    kind="dramas"
                    label={t('list.dramas')}
                    entries={groups.listed}
                    renderRow={(entry, sortable) => (
                        <DramaRow key={entry.id} entry={entry} flags={flags} sortable={sortable} />
                    )}
                />
                <LockedSection
                    label={t('list.notListed', { count: groups.pending.length })}
                    entries={groups.pending}
                    flags={flags}
                />
                <LockedSection
                    label={unlistedLabelOf(groups.unlisted)}
                    entries={groups.unlisted}
                    flags={flags}
                />
            </div>
            <ListLegend legend={legendOf(dramas, flags)} />
            {adding && (
                <NewDramaDialog
                    onClose={() => setAdding(false)}
                    onRescan={() => {
                        setAdding(false);
                        void rescan();
                    }}
                />
            )}
        </>
    );
}
