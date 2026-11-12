/*
 * 排程卡頂部細字 +「編輯｜預覽」tabs + 對應 tabpanel（_mockups_/admin-schedule-unlist ⑧ ⑨，用戶 2026-11-12）：
 * 編輯 = 左上架、右下架兩個 panel；預覽 = 合併時間軸 + 上下架批次表（唯讀）。
 * 時間軸 / 批次表嘅「今日」= admin 本機日子（localToday）
 */
import type { SchedulePlan } from '@903-player/catalog';
import { useId, useState } from 'react';
import { t } from '../../i18n/t';
import { localToday } from '../../model/dates';
import { BatchTable } from './BatchTable';
import { PreviewTimeline } from './PreviewTimeline';
import { ViewTabs, type ScheduleView } from './ScheduleBars';
import type { ScheduleContext, ScheduleForm } from './scheduleModel';
import { ListingPanel, UnlistPanel } from './SchedulePanels';
import { previewDays, progressText } from './timelineModel';

interface ScheduleViewsProps {
    ctx: ScheduleContext;
    form: ScheduleForm;
    plan: SchedulePlan | null;
    error?: string | undefined;
    unreleased: boolean;
    /** 有未儲存嘅改動（包括從未儲存過） */
    draft: boolean;
    onChange: (form: ScheduleForm) => void;
}

/** 預覽（mockup ⑨，唯讀）：今日起每日一格嘅合併時間軸 + 上下架批次表 */
function SchedulePreview({
    plan,
    ctx,
    marker,
}: {
    plan: SchedulePlan;
    ctx: ScheduleContext;
    marker: string;
}) {
    const days = previewDays(plan, ctx.today);
    return (
        <>
            <PreviewTimeline plan={plan} days={days} today={marker} />
            {days.length > 0 && <BatchTable days={days} today={marker} />}
        </>
    );
}

export function ScheduleViews({
    ctx,
    form,
    plan,
    error,
    unreleased,
    draft,
    onChange,
}: ScheduleViewsProps) {
    const [view, setView] = useState<ScheduleView>('edit');
    const idBase = useId();
    const marker = localToday();
    const panels = { ctx, form, plan, unreleased, today: marker, onChange };
    return (
        <>
            <div className="viewbar">
                {/* 未儲存講「即將排程…（未儲存）」，唔好扮已排程（用戶 2026-11-12） */}
                <span className="muted small">{progressText(ctx, { draft })}</span>
                <ViewTabs view={view} idBase={idBase} onChange={setView} />
            </div>
            {error && <p className="note bad">{t('schedule.planFailed', { error })}</p>}
            <div
                id={`${idBase}-panel`}
                className="view-panel"
                role="tabpanel"
                aria-labelledby={`${idBase}-tab-${view}`}
            >
                {view === 'edit' ? (
                    <div className="split">
                        <ListingPanel {...panels} />
                        <UnlistPanel {...panels} />
                    </div>
                ) : (
                    plan && <SchedulePreview plan={plan} ctx={ctx} marker={marker} />
                )}
            </div>
        </>
    );
}
