/*
 * 拖 ⠿ 排序（dnd-kit）：Design Origin: mockup: _mockups_/admin/index.html#s2b
 * 鍵盤：focus ⠿ 撳 Space 拎起、↑↓ 移、Space 放低、Esc 取消（dnd-kit KeyboardSensor）
 * 放手（onReorder）即存由 caller 負責；減少動態時唔做位移過場
 */
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    rectSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { ReactNode } from 'react';
import { announcementsFor, screenReaderInstructions } from './sortableAnnouncements';
import { SortableItem, type SortableRender } from './SortableItem';

export type { SortableRender } from './SortableItem';

interface SortableListProps<T> {
    items: readonly T[];
    idOf: (item: T) => string;
    labelOf: (item: T) => string;
    onReorder: (ids: string[]) => void;
    renderItem: (item: T, sortable: SortableRender) => ReactNode;
    /** chips 用 rect（會換行），列表用 vertical */
    layout?: 'vertical' | 'wrap';
}

export function SortableList<T>({
    items,
    idOf,
    labelOf,
    onReorder,
    renderItem,
    layout = 'vertical',
}: SortableListProps<T>) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const ids = items.map(idOf);
    const label = (id: string) => labelOf(items[ids.indexOf(id)] as T);
    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
    };
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            accessibility={{
                announcements: announcementsFor(label, (id) => ids.indexOf(id)),
                screenReaderInstructions,
            }}
        >
            <SortableContext
                items={ids}
                strategy={layout === 'wrap' ? rectSortingStrategy : verticalListSortingStrategy}
            >
                {items.map((item) => (
                    <SortableItem key={idOf(item)} id={idOf(item)} label={labelOf(item)}>
                        {(sortable) => renderItem(item, sortable)}
                    </SortableItem>
                ))}
            </SortableContext>
        </DndContext>
    );
}
