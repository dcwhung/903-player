/*
 * 一個短篇嘅排程：Design Origin: mockup: _mockups_/admin-schedule-unlist/index.html（⑧ 編輯、⑨ 預覽）
 * 「編輯 / 預覽」segmented：編輯 = 左上架、右下架兩個 panel；預覽 = 合併時間軸 + 上下架批次表（唯讀）。
 * 下架日唔遲過上架日只喺撳「儲存」時彈錯誤提示（儲存掣上面，role="alert"），改設定就收返
 */
import { hkToday, type SchedulePlan } from '@903-player/catalog';
import { useState } from 'react';
import type { RawDefinition, ScheduleState } from '../../api/types';
import { t } from '../../i18n/t';
import { countOf } from '../../model/raw';
import { EditorNotices } from '../editor/EditorNotices';
import { BatchTable } from './BatchTable';
import { ScheduleSaveBar, ViewSwitch, type ScheduleView } from './ScheduleBars';
import type { ScheduleForm } from './scheduleModel';
import { ListingPanel, UnlistPanel } from './SchedulePanels';
import { PreviewTimeline } from './PreviewTimeline';
import { isUnreleased, scheduleContextOf } from './stripModel';
import { previewDays, progressText } from './timelineModel';
import type { DramaEditorState } from './useDramaEditor';
import { planOf, saveProblemOf, useScheduleForm } from './useScheduleForm';
import type { useScheduleSave } from './useScheduleSave';

interface ArcScheduleProps {
    state: DramaEditorState;
    arc: RawDefinition;
    arcId: string;
    saved: ScheduleState | null;
    actions: ReturnType<typeof useScheduleSave>;
}

/** 預覽（mockup ⑨，唯讀）：今日起每日一格嘅合併時間軸 + 上下架批次表 */
function SchedulePreview({ plan, today }: { plan: SchedulePlan; today: string }) {
    const days = previewDays(plan, today);
    return (
        <>
            <PreviewTimeline plan={plan} days={days} />
            {days.length > 0 && <BatchTable days={days} />}
        </>
    );
}

/** 轉上架 / 其他分頁未儲存 / 儲存結果（422 = 中文錯誤提示，放喺儲存掣上面） */
function ScheduleNotes({ state, arc, actions }: Omit<ArcScheduleProps, 'arcId' | 'saved'>) {
    return (
        <>
            {arc.enabled === false && <p className="note info">{t('schedule.enableNote')}</p>}
            {state.editor.dirtyKeys.length > 0 && (
                <p className="note warn">{t('schedule.unsavedNote')}</p>
            )}
            <EditorNotices
                status={{ saving: actions.saving, problem: actions.problem, warnings: [] }}
                fieldErrors={0}
                onReload={() => void state.editor.reload()}
            />
        </>
    );
}

export function ArcSchedule({ state, arc, arcId, saved, actions }: ArcScheduleProps) {
    const ctx = scheduleContextOf(state.editor.draft?.definition ?? {}, arc, hkToday(), !!saved);
    const { form, setForm, rule, dirty, changed, initial } = useScheduleForm(saved, ctx);
    const [view, setView] = useState<ScheduleView>('edit');
    if (countOf(arc) === 0) return <p className="note warn">{t('schedule.noCount')}</p>;
    const { plan, error } = planOf(rule, ctx);
    const change = (next: ScheduleForm) => {
        actions.clear();
        setForm(next);
    };
    const save = () => {
        const problem = saveProblemOf(rule, ctx);
        if (problem) actions.reject(problem);
        else void actions.save(arcId, rule);
    };
    const unreleased = isUnreleased(arc, saved !== null);
    const panels = { ctx, form, plan, unreleased, onChange: change };
    return (
        <div className="card" id="schedule-panel" role="tabpanel" aria-labelledby={`tab-${arcId}`}>
            <div className="viewbar">
                <span className="muted small">{progressText(ctx)}</span>
                <ViewSwitch view={view} onChange={setView} />
            </div>
            {error && <p className="note bad">{t('schedule.planFailed', { error })}</p>}
            {view === 'edit' ? (
                <div className="split">
                    <ListingPanel {...panels} />
                    <UnlistPanel {...panels} />
                </div>
            ) : (
                plan && <SchedulePreview plan={plan} today={ctx.today} />
            )}
            <ScheduleNotes state={state} arc={arc} actions={actions} />
            <ScheduleSaveBar
                canDelete={saved !== null}
                canRevert={changed}
                canSave={dirty && state.editor.dirtyKeys.length === 0}
                fromTodos={state.origin.fromTodos}
                saving={actions.saving}
                onDelete={() => void actions.remove(arcId)}
                onRevert={() => change(initial)}
                onSave={save}
            />
        </div>
    );
}
