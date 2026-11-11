/*
 * 排程 tab 嘅兩條掣列（_mockups_/admin-schedule-unlist ⑧ ⑨）：
 * 頂「編輯 / 預覽」segmented；底「↶ 復原」（最左，同儲存掣分開）+ 刪除排程 + 儲存
 */
import { Undo2 } from 'lucide-react';
import { t } from '../../i18n/t';

export type ScheduleView = 'edit' | 'preview';
const VIEWS: readonly ScheduleView[] = ['edit', 'preview'];

export function ViewSwitch({
    view,
    onChange,
}: {
    view: ScheduleView;
    onChange: (view: ScheduleView) => void;
}) {
    return (
        <div className="seg" role="group" aria-label={t('schedule.viewLabel')}>
            {VIEWS.map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => onChange(v)}>
                    {t(v === 'edit' ? 'schedule.viewEdit' : 'schedule.viewPreview')}
                </button>
            ))}
        </div>
    );
}

interface ScheduleSaveBarProps {
    canDelete: boolean;
    canRevert: boolean;
    canSave: boolean;
    fromTodos: boolean;
    saving: boolean;
    onDelete: () => void;
    onRevert: () => void;
    onSave: () => void;
}

export function ScheduleSaveBar(props: ScheduleSaveBarProps) {
    const label = props.fromTodos ? t('editor.saveAndBack') : t('editor.save');
    return (
        <div className="savebar">
            <div className="actions">
                {props.canRevert && (
                    <button type="button" disabled={props.saving} onClick={props.onRevert}>
                        <Undo2 aria-hidden="true" />
                        {t('editor.revert')}
                    </button>
                )}
                {props.canDelete && (
                    <button
                        type="button"
                        className="ghost-danger"
                        disabled={props.saving}
                        onClick={props.onDelete}
                    >
                        {t('schedule.deleteSchedule')}
                    </button>
                )}
            </div>
            <button
                type="button"
                className="primary"
                disabled={!props.canSave || props.saving}
                onClick={props.onSave}
            >
                {props.saving ? t('editor.saving') : label}
            </button>
        </div>
    );
}
