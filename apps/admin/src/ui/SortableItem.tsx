/* 單一可拖項目：畀 caller 一個 ref / style 放喺 row 根元素，同一粒 ⠿ handle */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { t } from '../i18n/t';
import { prefersReducedMotion } from '../utils/motion';

export interface SortableRender {
    setNodeRef: (node: HTMLElement | null) => void;
    style: CSSProperties;
    handle: ReactNode;
    isDragging: boolean;
}

/** 位移過場（--motion-base）；減少動態就直接跳位 */
const SORT_TRANSITION = { duration: 240, easing: 'cubic-bezier(0.2, 0, 0, 1)' };

interface SortableItemProps {
    id: string;
    label: string;
    children: (sortable: SortableRender) => ReactNode;
}

export function SortableItem({ id, label, children }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, transition: prefersReducedMotion() ? null : SORT_TRANSITION });
    const handle = (
        <button
            type="button"
            className="handle"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={t('list.dragHandle', { name: label })}
            title={t('list.dragHandle', { name: label })}
        >
            <GripVertical aria-hidden="true" />
        </button>
    );
    const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
    return <>{children({ setNodeRef, style, handle, isDragging })}</>;
}
