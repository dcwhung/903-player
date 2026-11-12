/*
 * 排程 tab 嘅兩條掣列（_mockups_/admin-schedule-unlist ⑧ ⑨）：
 * 頂「編輯｜預覽」tabs；底「↶ 復原」（最左，同儲存掣分開）+ 刪除 + 儲存；掣全部有 outline icon
 */
import { Eye, Pencil, Save, Trash2, Undo2, type LucideIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { t } from '../../i18n/t';

export type ScheduleView = 'edit' | 'preview';
const VIEWS: readonly ScheduleView[] = ['edit', 'preview'];
/** 掣左邊 outline icon（同 SaveBar 一樣，aria-hidden） */
const VIEW_ICONS: Record<ScheduleView, LucideIcon> = { edit: Pencil, preview: Eye };

/** 左右方向鍵 / Home / End 換 tab（自動啟用，focus 跟住去） */
const NEXT_KEYS: Record<string, (index: number) => number> = {
    ArrowRight: (i) => (i + 1) % VIEWS.length,
    ArrowLeft: (i) => (i - 1 + VIEWS.length) % VIEWS.length,
    Home: () => 0,
    End: () => VIEWS.length - 1,
};

/**
 * 「編輯｜預覽」tabs（用戶 2026-11-12）：同 player 主頁 tabs 一樣嘅形狀，膠囊軌道 + 一粒共用嘅揀中膠囊
 * （主色實底、白字粗體），換 tab 時膠囊滑過去（減少動態就直接換）
 */
export function ViewTabs({
    view,
    idBase,
    onChange,
}: {
    view: ScheduleView;
    /** tab id = `${idBase}-tab-${view}`、panel id = `${idBase}-panel` */
    idBase: string;
    onChange: (view: ScheduleView) => void;
}) {
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const next = NEXT_KEYS[event.key];
        if (!next) return;
        event.preventDefault();
        const target = VIEWS[next(VIEWS.indexOf(view))] ?? view;
        onChange(target);
        document.getElementById(`${idBase}-tab-${target}`)?.focus();
    };
    return (
        <div className="view-tabs" role="tablist" aria-label={t('schedule.viewLabel')}>
            <span className="view-pill" data-view={view} aria-hidden="true" />
            {VIEWS.map((v) => {
                const Icon = VIEW_ICONS[v];
                const selected = view === v;
                return (
                    <button
                        key={v}
                        id={`${idBase}-tab-${v}`}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls={`${idBase}-panel`}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => onChange(v)}
                        onKeyDown={onKeyDown}
                    >
                        <Icon aria-hidden="true" />
                        {t(v === 'edit' ? 'schedule.viewEdit' : 'schedule.viewPreview')}
                    </button>
                );
            })}
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
                        aria-label={t('schedule.deleteScheduleLabel')}
                        disabled={props.saving}
                        onClick={props.onDelete}
                    >
                        <Trash2 aria-hidden="true" />
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
                <Save aria-hidden="true" />
                {props.saving ? t('editor.saving') : label}
            </button>
        </div>
    );
}
