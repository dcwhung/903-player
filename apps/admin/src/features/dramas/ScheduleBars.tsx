/*
 * 排程 tab 嘅兩條掣列（_mockups_/admin-schedule-unlist ⑧ ⑨）：
 * 頂「編輯｜預覽」tabs；底「↶ 復原」（最左，同儲存掣分開）+ 刪除（要確認）+ 儲存；掣全部有 outline icon
 */
import { Eye, Pencil, Save, Undo2 } from 'lucide-react';
import { t } from '../../i18n/t';
import { SegmentedTabs, type SegmentedOption } from '../../ui/SegmentedTabs';
import { DeleteSchedule } from './DeleteSchedule';

export type ScheduleView = 'edit' | 'preview';
/** 掣左邊 outline icon（同 SaveBar 一樣，aria-hidden） */
const VIEW_OPTIONS: readonly SegmentedOption<ScheduleView>[] = [
    { value: 'edit', label: t('schedule.viewEdit'), icon: Pencil },
    { value: 'preview', label: t('schedule.viewPreview'), icon: Eye },
];

/**
 * 「編輯｜預覽」tabs（用戶 2026-11-12）：共用 SegmentedTabs（膠囊軌道 + 滑動揀中膠囊；
 * 方向鍵 / Home / End 換 tab，自動啟用，focus 跟住去）
 */
export function ViewTabs({
    view,
    panelId,
    onChange,
}: {
    view: ScheduleView;
    /** 控制嘅 tabpanel id；tab id = segmentTabId(panelId, view) */
    panelId: string;
    onChange: (view: ScheduleView) => void;
}) {
    return (
        <SegmentedTabs
            mode="tabs"
            label={t('schedule.viewLabel')}
            options={VIEW_OPTIONS}
            value={view}
            panelId={panelId}
            onChange={onChange}
        />
    );
}

interface ScheduleSaveBarProps {
    canDelete: boolean;
    /** 其他分頁有未儲存改動：刪除會重讀劇集、草稿會冇咗，唔畀刪（AU-022） */
    deleteBlocked: boolean;
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
                    <DeleteSchedule
                        disabled={props.saving || props.deleteBlocked}
                        onConfirm={props.onDelete}
                    />
                )}
            </div>
            <button
                type="button"
                className="primary"
                disabled={!props.canSave || props.saving}
                onClick={props.onSave}
            >
                <Save aria-hidden="true" />
                {props.saving ? t('editor.saving') : label}
            </button>
        </div>
    );
}
