/*
 * 短篇 tab 一行：⠿ | 新 + 名 + ⌄ | 狀態 pill；成行撳開 / 閂（3c），⌄ 掣俾鍵盤用
 * Design Origin: mockup: _mockups_/admin-style/index.html#e（.arc-row）；結構 mockup: _mockups_/admin/index.html#s5
 */
import { hkToday } from '@903-player/catalog';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { arcLabel, countOf } from '../../model/raw';
import { arcStatusOf } from '../../model/status';
import { Pill } from '../../ui/Pill';
import type { SortableRender } from '../../ui/SortableList';
import { rowClickTo } from '../lists/rowClick';
import type { DramaEditorState } from './useDramaEditor';

interface ArcRowProps {
    state: DramaEditorState;
    arc: RawDefinition;
    arcId: string;
    open: boolean;
    onToggle: () => void;
    sortable: SortableRender;
}

export function ArcRow({ state, arc, arcId, open, onToggle, sortable }: ArcRowProps) {
    const drama = state.editor.draft?.definition ?? {};
    const isNew = state.isNewArc(arcId);
    const status = arcStatusOf(drama, arc, hkToday(), isNew);
    const { setNodeRef, style, handle, isDragging } = sortable;
    const Chevron = open ? ChevronDown : ChevronRight;
    return (
        <li
            ref={setNodeRef}
            style={style}
            id={arcId}
            className={`row arc-line${open ? ' open' : ''}${isDragging ? ' is-dragging' : ''}`}
            onClick={rowClickTo(onToggle)}
        >
            {handle}
            <span className="text">
                <span className="name">
                    {isNew && <Pill tone="new">{t('status.newArc')}</Pill>}
                    {arcLabel(arc)}
                    <button
                        type="button"
                        className="link-btn arc-toggle"
                        aria-expanded={open}
                        aria-label={t('drama.expandArc', { name: arcLabel(arc) })}
                        onClick={onToggle}
                    >
                        <Chevron className="arc-chevron" aria-hidden="true" />
                    </button>
                </span>
                {!open && (
                    <span className="meta">
                        <code>{arcId}</code> · {t('list.episodes', { count: countOf(arc) })}
                    </span>
                )}
            </span>
            <div className="pills">
                <Pill tone={status.tone} dot={status.tone !== 'none'}>
                    {status.text}
                </Pill>
            </div>
        </li>
    );
}
