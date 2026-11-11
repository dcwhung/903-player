/*
 * 短篇 tab 一行：⠿ | 名（撳展開；展開咗名稱直接係輸入框 = 播放器顯示名）| 狀態 pill
 * Design Origin: mockup: _mockups_/admin/index.html#s5（.row / .row.open）
 */
import { hkToday } from '@903-player/catalog';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { arcLabel, countOf, str } from '../../model/raw';
import { arcStatusOf } from '../../model/status';
import { Pill } from '../../ui/Pill';
import type { SortableRender } from '../../ui/SortableList';
import { withOptional } from '../shows/showModel';
import { PLACEHOLDER_ID, updateArc } from './dramaModel';
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
    return (
        <li
            ref={setNodeRef}
            style={style}
            id={arcId}
            className={`row${open ? ' open' : ''}${isDragging ? ' is-dragging' : ''}`}
        >
            {handle}
            <span className="text">
                <ArcName state={state} arc={arc} arcId={arcId} open={open} onToggle={onToggle} />
                {!open && (
                    <span className="meta">
                        <code>{arcId}</code> · {t('list.episodes', { count: countOf(arc) })}
                    </span>
                )}
            </span>
            <div className="pills">
                {PLACEHOLDER_ID.test(arcId) && <Pill tone="bad">{t('status.needsId')}</Pill>}
                <Pill tone={status.tone} dot={status.tone !== 'none'}>
                    {status.text}
                </Pill>
            </div>
        </li>
    );
}

function ArcName({ state, arc, arcId, open, onToggle }: Omit<ArcRowProps, 'sortable'>) {
    const Chevron = open ? ChevronDown : ChevronRight;
    const setName = (value: string) =>
        state.editor.setDefinition((d) =>
            updateArc(d, arcId, (a) => withOptional(a, 'displayName', value)),
        );
    return (
        <span className="name">
            {state.isNewArc(arcId) && <Pill tone="new">{t('status.newArc')}</Pill>}
            {open && (
                <input
                    className="inline"
                    type="text"
                    aria-label={t('drama.arcName')}
                    value={str(arc, 'displayName') ?? str(arc, 'name') ?? ''}
                    onChange={(e) => setName(e.target.value)}
                />
            )}
            <button
                type="button"
                className="link-btn arc-toggle"
                aria-expanded={open}
                aria-label={t('drama.expandArc', { name: arcLabel(arc) })}
                onClick={onToggle}
            >
                {!open && arcLabel(arc)} <Chevron aria-hidden="true" />
            </button>
        </span>
    );
}
