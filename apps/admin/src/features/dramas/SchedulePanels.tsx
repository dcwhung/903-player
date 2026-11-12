/*
 * 編輯模式左右兩個 panel（_mockups_/admin-schedule-unlist ⑧）：
 * 左「上架」（綠）= 只排未上架嘅集數：快速套用 + 句子 + 時間軸；全部已上架就淨係「✓ 已全部上架」。
 * 右「下架」（紅）= 已上架 + 已排程上架嘅集數：4 個下架方式（快速套用 chip）+ 句子 + 時間軸。
 * 日期欄最早 = 今日（localToday，同時間軸「今日」一樣；上架仲要喺已上架最後一批之後）
 */
import { addDays, type SchedulePlan } from '@903-player/catalog';
import { useId } from 'react';
import { t, type MessageKey } from '../../i18n/t';
import { latestOf } from '../../ui/dateFieldModel';
import { Pill } from '../../ui/Pill';
import {
    isAllListed,
    switchUnlist,
    UNLIST_MODES,
    type ListingForm,
    type ScheduleContext,
    type ScheduleForm,
    type UnlistMode,
} from './scheduleModel';
import { ListingSentence, UnlistSentence } from './ScheduleSentence';
import { SchedulePresets } from './SchedulePresets';
import { ListingTimeline, UnlistTimeline } from './ScheduleTimeline';
import { doneText, listingScopeText, unlistScopeText } from './timelineModel';

interface PanelProps {
    ctx: ScheduleContext;
    form: ScheduleForm;
    plan: SchedulePlan | null;
    /** 下架又冇排程：未上過架（唔出灰 ✓，講明「未上架」） */
    unreleased?: boolean;
    /** 時間軸「今日」（本機日子） */
    today: string;
    onChange: (form: ScheduleForm) => void;
}

const UNLIST_LABEL: Record<UnlistMode, MessageKey> = {
    none: 'schedule.unlistNone',
    date: 'schedule.unlistDate',
    afterDays: 'schedule.unlistAfterDays',
    periodic: 'schedule.unlistPeriodic',
};

/** 快速套用由句子嘅開始日起；自訂批次就由聽日起 */
const presetStart = (listing: ListingForm, ctx: ScheduleContext) =>
    listing.mode === 'all' || listing.mode === 'periodic' ? listing.start : addDays(ctx.today, 1);

export function ListingPanel({ ctx, form, plan, unreleased = false, today, onChange }: PanelProps) {
    const titleId = useId();
    const lastListed = ctx.listed.at(-1)?.date;
    const setListing = (listing: ListingForm) => onChange({ ...form, listing });
    return (
        <section className="panel up" aria-labelledby={titleId}>
            <h3 id={titleId} className="panel-title">
                <Pill tone="ok" dot>
                    {t('schedule.listPanel')}
                </Pill>
            </h3>
            {isAllListed(ctx) ? (
                <p className="banner ok">{doneText(ctx)}</p>
            ) : (
                <>
                    <p className="scope">{listingScopeText(ctx)}</p>
                    {unreleased && (
                        <p className="strip-unreleased" role="status">
                            {t('schedule.unreleased')}
                        </p>
                    )}
                    <SchedulePresets
                        listing={form.listing}
                        start={presetStart(form.listing, ctx)}
                        onChange={setListing}
                    />
                    <ListingSentence
                        listing={form.listing}
                        min={latestOf(today, lastListed ? addDays(lastListed, 1) : undefined)}
                        onChange={setListing}
                    />
                </>
            )}
            {plan && <ListingTimeline plan={plan} ctx={ctx} today={today} />}
        </section>
    );
}

export function UnlistPanel({ ctx, form, plan, today, onChange }: PanelProps) {
    const titleId = useId();
    return (
        <section className="panel down" aria-labelledby={titleId}>
            <h3 id={titleId} className="panel-title">
                <Pill tone="bad" dot>
                    {t('schedule.unlistPanel')}
                </Pill>
            </h3>
            <p className="scope">{unlistScopeText(ctx)}</p>
            {/* 同上架 panel 嘅快速套用一樣：一粒粒 chip，揀咗實色（mockup ⑧ 用戶修正） */}
            <div className="presets" role="group" aria-label={t('schedule.unlistModes')}>
                <span className="presets-label muted small" aria-hidden="true">
                    {t('schedule.presetsLabel')}
                </span>
                {UNLIST_MODES.map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        aria-pressed={form.unlist.mode === mode}
                        onClick={() =>
                            form.unlist.mode !== mode &&
                            onChange({ ...form, unlist: switchUnlist(mode, form, ctx) })
                        }
                    >
                        {t(UNLIST_LABEL[mode])}
                    </button>
                ))}
            </div>
            <UnlistSentence
                unlist={form.unlist}
                min={today}
                onChange={(unlist) => onChange({ ...form, unlist })}
            />
            {plan && <UnlistTimeline plan={plan} ctx={ctx} today={today} />}
        </section>
    );
}
