/*
 * 預覽合併時間軸（_mockups_/admin-schedule-unlist ⑨，唯讀）：今日起每個日子一格，藍格上架、紅格下架，加「今日」；
 * 每格 hover / 鍵盤 focus 出 tooltip（「第 6 集：23/11 上架，14/12 下架，共 21 日」），讀屏讀 aria-label
 */
import type { EpisodeSchedule, SchedulePlan } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { dayMonth, shortDate } from '../../model/dates';
import { Tooltip } from '../../ui/Tooltip';
import {
    cellsOf,
    episodeTip,
    rangeText,
    withToday,
    type EpisodeSpan,
    type PreviewDay,
} from './timelineModel';

/** 預覽格：tooltip 講呢集幾時上架 / 下架；「…」唔出 tooltip */
function TipCells({
    span,
    tone,
    episodes,
}: {
    span: EpisodeSpan;
    tone: 'on' | 'off';
    episodes: ReadonlyMap<number, EpisodeSchedule>;
}) {
    return (
        <div className={`eps-cells ${tone}`}>
            {cellsOf(span).map((no, i) => {
                const episode = no === null ? undefined : episodes.get(no);
                if (!episode)
                    return (
                        <span key={`gap${i}`} className="gap" aria-hidden="true">
                            …
                        </span>
                    );
                const tip = episodeTip(episode);
                return (
                    <Tooltip key={episode.no} text={tip}>
                        <span role="img" aria-label={tip} tabIndex={0}>
                            {episode.no}
                        </span>
                    </Tooltip>
                );
            })}
        </div>
    );
}

/** 唔撞日嘅「今日」格：上面今日日子，格入面置中「今日」 */
function TodayDay({ date }: { date: string }) {
    return (
        <div className="day-group today today-cell">
            <span className="day-date">{shortDate(date)}</span>
            <div className="eps-cells">
                <span>{t('schedule.today')}</span>
            </div>
        </div>
    );
}

/** 一日：日子（撞正今日加「（今日）」）、上架藍格、下架紅格 */
function Day({
    day,
    isToday,
    episodes,
}: {
    day: PreviewDay;
    isToday: boolean;
    episodes: ReadonlyMap<number, EpisodeSchedule>;
}) {
    const label = dayMonth(day.date);
    return (
        <div className={`day-group${isToday ? ' today' : ''}`}>
            <span className="day-date">
                {isToday ? t('schedule.todayLabel', { label }) : label}
            </span>
            {day.listings.map((range) => (
                <div key={`l${range.first}`} className="day-part">
                    <TipCells span={range} tone="on" episodes={episodes} />
                    <span className="seg-date">
                        {t('schedule.previewList', { range: rangeText(range) })}
                    </span>
                </div>
            ))}
            {day.removals.map((range) => (
                <div key={`r${range.first}`} className="day-part">
                    <TipCells span={range} tone="off" episodes={episodes} />
                    <span className="seg-date red">
                        {t('schedule.previewUnlist', { range: rangeText(range) })}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function PreviewTimeline({
    plan,
    days,
    today,
}: {
    plan: SchedulePlan;
    days: PreviewDay[];
    /** 本機今日：撞正某日 = 嗰日加「（今日）」；唔撞 = 插一格「今日」（用戶 2026-11-12） */
    today: string;
}) {
    const episodes = new Map(plan.episodes.map((e) => [e.no, e]));
    if (days.length === 0) return <p className="muted">{t('schedule.previewEmpty')}</p>;
    return (
        <div className="strip preview" role="group" aria-label={t('schedule.previewTimeline')}>
            {withToday(days, (day) => day.date, today).map((m) =>
                m.kind === 'today' ? (
                    <TodayDay key="today" date={m.date} />
                ) : (
                    <Day key={m.item.date} day={m.item} isToday={m.isToday} episodes={episodes} />
                ),
            )}
        </div>
    );
}
