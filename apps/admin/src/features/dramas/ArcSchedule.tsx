/*
 * 一個短篇嘅排程：Design Origin: mockup: _mockups_/admin-schedule-unlist/index.html（⑧ 編輯、⑨ 預覽）
 * 「編輯｜預覽」tabs（膠囊，同 player 主頁 tabs）：編輯 = 左上架、右下架兩個 panel；預覽 = 合併時間軸 + 上下架批次表（唯讀）。
 * 下架日唔遲過上架日只喺撳「儲存」時彈錯誤提示（儲存掣上面，role="alert"），改設定就收返
 */
import { hkToday } from '@903-player/catalog';
import type { RawDefinition, ScheduleState } from '../../api/types';
import { t } from '../../i18n/t';
import { countOf } from '../../model/raw';
import { EditorNotices } from '../editor/EditorNotices';
import { ScheduleSaveBar } from './ScheduleBars';
import type { ScheduleForm } from './scheduleModel';
import { ScheduleViews } from './ScheduleViews';
import { isUnreleased, scheduleContextOf } from './stripModel';
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
    const { form, setForm, rule, dirty, listingDirty, changed, initial } = useScheduleForm(
        saved,
        ctx,
    );
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
    return (
        <div className="card" id="schedule-panel" role="tabpanel" aria-labelledby={`tab-${arcId}`}>
            <ScheduleViews
                ctx={ctx}
                form={form}
                plan={plan}
                error={error}
                unreleased={unreleased}
                draft={listingDirty}
                onChange={change}
            />
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
