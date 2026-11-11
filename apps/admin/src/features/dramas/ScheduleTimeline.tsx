/*
 * 排程時間軸（_mockups_/admin-schedule-unlist ⑧ ⑨）：
 * 編輯模式：上架 = 已上架一段灰格 ✓ + 每批藍格；下架 = 每批紅色刪除線格（已下架嘅淡色、唔受新規則影響）。
 * 預覽模式見 PreviewTimeline
 */
import type { SchedulePlan } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { dayMonth, shortDate } from '../../model/dates';
import type { ScheduleContext } from './scheduleModel';
import {
    cellsOf,
    listingTimeline,
    rangeText,
    unlistTimeline,
    type EpisodeSpan,
} from './timelineModel';

type Tone = 'listed' | 'b1' | 'b2' | 'off' | 'gone';

/** 一段集數：格（長嘅「頭 … 尾」）+ 下面日子 / 說明；讀屏讀說明 + 集數範圍 */
function Group({ span, tone, label }: { span: EpisodeSpan; tone: Tone; label: string }) {
    return (
        <div className={`seg-batch ${tone}`}>
            <div className="eps-cells" aria-hidden="true">
                {cellsOf(span).map((no, i) => (
                    <span key={no ?? `gap${i}`} className={no === null ? 'gap' : undefined}>
                        {no ?? '…'}
                    </span>
                ))}
            </div>
            <span className="seg-date">
                {label}
                <span className="sr-only">{` ${rangeText(span)}`}</span>
            </span>
        </div>
    );
}

export function ListingTimeline({ plan, ctx }: { plan: SchedulePlan; ctx: ScheduleContext }) {
    const { listed, planned } = listingTimeline(plan, ctx);
    return (
        <div className="strip" role="group" aria-label={t('schedule.listTimeline')}>
            {listed && <Group span={listed} tone="listed" label={t('schedule.listedMark')} />}
            {planned.map((batch, i) => (
                <Group
                    key={batch.first}
                    span={batch}
                    tone={i % 2 === 0 ? 'b1' : 'b2'}
                    label={shortDate(batch.date)}
                />
            ))}
        </div>
    );
}

export function UnlistTimeline({ plan, ctx }: { plan: SchedulePlan; ctx: ScheduleContext }) {
    const { removed, planned } = unlistTimeline(plan, ctx);
    if (removed.length === 0 && planned.length === 0) return null;
    return (
        <>
            <div className="strip" role="group" aria-label={t('schedule.unlistTimeline')}>
                {removed.map((range) => (
                    <Group
                        key={`gone${range.first}`}
                        span={range}
                        tone="gone"
                        label={t('schedule.unlistedMark', { date: dayMonth(range.date) })}
                    />
                ))}
                {planned.map((range) => (
                    <Group
                        key={range.first}
                        span={range}
                        tone="off"
                        label={shortDate(range.date)}
                    />
                ))}
            </div>
            {removed.length > 0 && (
                <div className="unlist-legend">
                    <span className="swatch" aria-hidden="true" />
                    {t('schedule.legendUnlisted')}
                </div>
            )}
        </>
    );
}
