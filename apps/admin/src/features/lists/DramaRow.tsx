/* 廣播劇列表一行：⠿ | 名稱格 | 短篇 / 集數 / 狀態（mockup ⑤ .drama-row） */
import type { LoadedEntry } from '../../api/types';
import { t } from '../../i18n/t';
import type { ChangeFlags } from '../../model/listModel';
import { isDaily, totalEpisodes } from '../../model/raw';
import type { SortableRender } from '../../ui/SortableList';
import { ArcCells } from './ArcCells';
import { EntryName } from './EntryName';
import { LockedHandle } from './LockedHandle';

interface DramaRowProps {
    entry: LoadedEntry;
    flags: ChangeFlags;
    sortable?: SortableRender;
    disabled?: boolean;
}

export function DramaRow({ entry, flags, sortable, disabled = false }: DramaRowProps) {
    const count = totalEpisodes(entry.definition);
    const meta = isDaily(entry.definition)
        ? t('list.daily', { count })
        : t('list.series', { count });
    const classes = [
        'drama-row',
        disabled ? 'disabled' : '',
        sortable?.isDragging ? 'is-dragging' : '',
    ];
    return (
        <li
            ref={sortable?.setNodeRef}
            style={sortable?.style}
            className={classes.filter(Boolean).join(' ')}
        >
            {sortable ? sortable.handle : <LockedHandle />}
            <EntryName entry={entry} flags={flags} meta={meta} />
            <ArcCells entry={entry} flags={flags} />
        </li>
    );
}
