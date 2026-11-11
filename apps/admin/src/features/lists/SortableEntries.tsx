/* 上架區（可拖 ⠿）：放手即存，未存好之前用新次序顯示 */
import type { ReactNode } from 'react';
import type { EntryKind, LoadedEntry } from '../../api/types';
import { nameOf } from '../../model/raw';
import { SortableList, type SortableRender } from '../../ui/SortableList';
import { applyOrder, useReorder } from './useReorder';

interface SortableEntriesProps {
    kind: EntryKind;
    label: string;
    entries: LoadedEntry[];
    renderRow: (entry: LoadedEntry, sortable: SortableRender) => ReactNode;
}

export function SortableEntries({ kind, label, entries, renderRow }: SortableEntriesProps) {
    const { pendingIds, error, reorder } = useReorder(kind);
    return (
        <>
            {error && (
                <p className="note bad" role="alert">
                    {error}
                </p>
            )}
            <ol className="list" aria-label={label}>
                <SortableList
                    items={applyOrder(entries, pendingIds)}
                    idOf={(entry) => entry.id}
                    labelOf={(entry) => nameOf(entry.definition, entry.id)}
                    onReorder={(ids) => void reorder(ids)}
                    renderItem={renderRow}
                />
            </ol>
        </>
    );
}
