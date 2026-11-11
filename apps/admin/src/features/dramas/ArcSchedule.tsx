/*
 * 一個短篇嘅排程（mockup ⑩ A + C）：預設 chip → 一句話規則 → 集數條（live preview）→ 排法唔同出批次表；
 * 刪除排程 / 儲存
 */
import { hkToday } from '@903-player/catalog';
import { useState } from 'react';
import type { RawDefinition, ScheduleState } from '../../api/types';
import { t } from '../../i18n/t';
import { countOf, firstNoOf } from '../../model/raw';
import { BatchTable } from './BatchTable';
import { EpisodeStrip } from './EpisodeStrip';
import { formOf, ruleOf } from './scheduleModel';
import { ScheduleSentence } from './ScheduleSentence';
import { SchedulePresets } from './SchedulePresets';
import { stripOf } from './stripModel';
import { useSchedulePreview } from './useSchedulePreview';
import type { useScheduleSave } from './useScheduleSave';
import type { DramaEditorState } from './useDramaEditor';

interface ArcScheduleProps {
    state: DramaEditorState;
    arc: RawDefinition;
    arcId: string;
    saved: ScheduleState | null;
    actions: ReturnType<typeof useScheduleSave>;
}

interface ScheduleSaveBarProps {
    canDelete: boolean;
    canSave: boolean;
    fromTodos: boolean;
    actions: ReturnType<typeof useScheduleSave>;
    onDelete: () => void;
    onSave: () => void;
}

function ScheduleSaveBar({
    canDelete,
    canSave,
    fromTodos,
    actions,
    onDelete,
    onSave,
}: ScheduleSaveBarProps) {
    const label = fromTodos ? t('editor.saveAndBack') : t('editor.save');
    return (
        <div className="savebar">
            <span>
                {canDelete && (
                    <button
                        type="button"
                        className="ghost-danger"
                        disabled={actions.saving}
                        onClick={onDelete}
                    >
                        {t('schedule.deleteSchedule')}
                    </button>
                )}
            </span>
            <button
                type="button"
                className="primary"
                disabled={!canSave || actions.saving}
                onClick={onSave}
            >
                {actions.saving ? t('editor.saving') : label}
            </button>
        </div>
    );
}

export function ArcSchedule({ state, arc, arcId, saved, actions }: ArcScheduleProps) {
    const today = hkToday();
    const [form, setForm] = useState(() => formOf(saved?.rule ?? null, today));
    const rule = ruleOf(form, firstNoOf(arc));
    const preview = useSchedulePreview(state.id, arcId, rule);
    const strip = stripOf(state.editor.draft?.definition ?? {}, arc, preview.expanded, today);
    const dirty = JSON.stringify(rule) !== JSON.stringify(saved?.rule ?? null);
    const start = form.mode === 'custom' ? today : form.start;
    if (countOf(arc) === 0) return <p className="note warn">{t('schedule.noCount')}</p>;
    return (
        <div className="card" id="schedule-panel" role="tabpanel" aria-labelledby={`tab-${arcId}`}>
            <SchedulePresets form={form} start={start} onChange={setForm} />
            <ScheduleSentence form={form} onChange={setForm} />
            <EpisodeStrip strip={strip} count={countOf(arc)} />
            {preview.error && (
                <p className="note bad">{t('schedule.previewFailed', { error: preview.error })}</p>
            )}
            {strip.comparison?.differs && <BatchTable strip={strip} rule={rule} />}
            {arc.enabled === false && <p className="note info">{t('schedule.enableNote')}</p>}
            {state.editor.dirtyKeys.length > 0 && (
                <p className="note warn">{t('schedule.unsavedNote')}</p>
            )}
            <ScheduleSaveBar
                canDelete={saved !== null}
                canSave={dirty && state.editor.dirtyKeys.length === 0}
                fromTodos={state.origin.fromTodos}
                actions={actions}
                onDelete={() => void actions.remove(arcId)}
                onSave={() => void actions.save(arcId, rule)}
            />
        </div>
    );
}
