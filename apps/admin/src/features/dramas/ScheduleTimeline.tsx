/*
 * 排程時間軸（_mockups_/admin-schedule-unlist ⑧ ⑨）：
 * 編輯模式：上架 = 已上架一段灰格 ✓ + 每批藍格；下架 = 每批紅色刪除線格（已下架嘅淡色、唔受新規則影響）。
 * 今日（用戶 2026-11-12）：撞正某批 = 嗰批日子加「（今日）」+ 高亮；唔撞 = 按日子次序插一格「今日」。
 * 預覽模式見 PreviewTimeline
 */
import type { SchedulePlan } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { dayMonth, shortDate } from '../../model/dates';
import type { ScheduleContext } from './scheduleModel';
import {
    cellsOf,
    listingStrip,
    rangeText,
    unlistStrip,
    type StripItem,
    type TodayMarked,
} from './timelineModel';

/** 一段集數：格（長嘅「頭 … 尾」）+ 下面日子 / 說明；讀屏讀說明 + 集數範圍 */
function Group({ item, label, isToday }: { item: StripItem; label: string; isToday: boolean }) {
    return (
        <div className={`seg-batch ${item.tone}${isToday ? ' today' : ''}`}>
            <div className="eps-cells" aria-hidden="true">
                {cellsOf(item.span).map((no, i) => (
                    <span key={no ?? `gap${i}`} className={no === null ? 'gap' : undefined}>
                        {no ?? '…'}
                    </span>
                ))}
            </div>
            <span className="seg-date">
                {isToday ? t('schedule.todayLabel', { label }) : label}
                <span className="sr-only">{` ${rangeText(item.span)}`}</span>
            </span>
        </div>
    );
}

/** 唔撞日嘅「今日」格：格入面置中寫「今日」，下面今日日子 */
function TodayCell({ date }: { date: string }) {
    return (
        <div className="seg-batch today today-cell">
            <div className="eps-cells">
                <span>{t('schedule.today')}</span>
            </div>
            <span className="seg-date">{shortDate(date)}</span>
        </div>
    );
}

function Strip({
    label,
    marked,
    labelOf,
}: {
    label: string;
    marked: readonly TodayMarked<StripItem>[];
    labelOf: (item: StripItem) => string;
}) {
    return (
        <div className="strip" role="group" aria-label={label}>
            {marked.map((m) =>
                m.kind === 'today' ? (
                    <TodayCell key="today" date={m.date} />
                ) : (
                    <Group
                        key={`${m.item.tone}${m.item.span.first}`}
                        item={m.item}
                        label={labelOf(m.item)}
                        isToday={m.isToday}
                    />
                ),
            )}
        </div>
    );
}

export function ListingTimeline({
    plan,
    ctx,
    today,
}: {
    plan: SchedulePlan;
    ctx: ScheduleContext;
    today: string;
}) {
    return (
        <Strip
            label={t('schedule.listTimeline')}
            marked={listingStrip(plan, ctx, today)}
            labelOf={(item) =>
                item.tone === 'listed' ? t('schedule.listedMark') : shortDate(item.date)
            }
        />
    );
}

export function UnlistTimeline({
    plan,
    ctx,
    today,
}: {
    plan: SchedulePlan;
    ctx: ScheduleContext;
    today: string;
}) {
    const marked = unlistStrip(plan, ctx, today);
    if (marked.length === 0) return null;
    const hasRemoved = marked.some((m) => m.kind === 'item' && m.item.tone === 'gone');
    return (
        <>
            <Strip
                label={t('schedule.unlistTimeline')}
                marked={marked}
                labelOf={(item) =>
                    item.tone === 'gone'
                        ? t('schedule.unlistedMark', { date: dayMonth(item.date) })
                        : shortDate(item.date)
                }
            />
            {hasRemoved && (
                <div className="unlist-legend">
                    <span className="swatch" aria-hidden="true" />
                    {t('schedule.legendUnlisted')}
                </div>
            )}
        </>
    );
}
