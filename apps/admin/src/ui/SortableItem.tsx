/* 單一可拖項目：畀 caller 一個 ref / style 放喺 row 根元素，同一粒 ⠿ handle */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { t } from '../i18n/t';
import { motionTiming, prefersReducedMotion } from '../utils/motion';

export interface SortableRender {
    setNodeRef: (node: HTMLElement | null) => void;
    style: CSSProperties;
    handle: ReactNode;
    isDragging: boolean;
}

interface SortableItemProps {
    id: string;
    label: string;
    children: (sortable: SortableRender) => ReactNode;
}

export function SortableItem({ id, label, children }: SortableItemProps) {
    // 位移過場跟 tokens.css（--motion-base / --motion-ease，S-806）；減少動態就直接跳位
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        transition: prefersReducedMotion() ? null : motionTiming('--motion-base'),
    });
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
