/*
 * 預覽合併時間軸（_mockups_/admin-schedule-unlist ⑨，唯讀）：今日起每個日子一格，藍格上架、紅格下架；
 * 每格 hover / 鍵盤 focus 出 tooltip（「第 6 集：23/11 上架，14/12 下架，共 21 日」），讀屏讀 aria-label
 */
import type { EpisodeSchedule, SchedulePlan } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { dayMonth } from '../../model/dates';
import { Tooltip } from '../../ui/Tooltip';
import { cellsOf, episodeTip, rangeText, type EpisodeSpan, type PreviewDay } from './timelineModel';

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
                        <span key={`gap${i}`} aria-hidden="true">
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

export function PreviewTimeline({ plan, days }: { plan: SchedulePlan; days: PreviewDay[] }) {
    const episodes = new Map(plan.episodes.map((e) => [e.no, e]));
    if (days.length === 0) return <p className="muted">{t('schedule.previewEmpty')}</p>;
    return (
        <div className="strip preview" role="group" aria-label={t('schedule.previewTimeline')}>
            {days.map((day) => (
                <div key={day.date} className="day-group">
                    <span className="day-date">{dayMonth(day.date)}</span>
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
            ))}
        </div>
    );
}
