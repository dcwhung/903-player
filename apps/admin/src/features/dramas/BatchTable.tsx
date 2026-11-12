/*
 * 預覽「上下架批次」表（mockup ⑨ table）：日期 / 上架 / 下架，集數範圍用 pill（藍 = 上架、紅 = 下架）；
 * 今日（用戶 2026-11-12）：撞正某行 = 日期加「（今日）」+ 淺主色成行底；唔撞 = 按次序插一行今日，上架 / 下架「—」
 */
import type { EpisodeRange } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { shortDate } from '../../model/dates';
import { Pill } from '../../ui/Pill';
import { rangeText, withToday, type PreviewDay } from './timelineModel';

function Ranges({ ranges, tone }: { ranges: readonly EpisodeRange[]; tone: 'info' | 'bad' }) {
    if (ranges.length === 0) return <span className="muted">{t('schedule.empty')}</span>;
    return (
        <span className="pills">
            {ranges.map((range) => (
                <Pill key={range.first} tone={tone}>
                    {rangeText(range)}
                </Pill>
            ))}
        </span>
    );
}

export function BatchTable({ days, today }: { days: readonly PreviewDay[]; today: string }) {
    return (
        // 同內容頁（節目 / 廣播劇列表）一樣嘅中性表：冇底色、--muted 表頭、--line 分隔線（用戶 2026-11-12）
        <div className="batch-section">
            <b className="batch-title">{t('schedule.batches')}</b>
            <div className="table-wrap">
                <table className="batches">
                    <thead>
                        <tr>
                            <th scope="col">{t('schedule.colDate')}</th>
                            <th scope="col">{t('schedule.colList')}</th>
                            <th scope="col">{t('schedule.colUnlist')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {withToday(days, (day) => day.date, today).map((m) => {
                            const day: PreviewDay =
                                m.kind === 'today'
                                    ? { date: m.date, listings: [], removals: [] }
                                    : m.item;
                            const isToday = m.kind === 'today' || m.isToday;
                            return (
                                <tr key={day.date} className={isToday ? 'today' : undefined}>
                                    <td>
                                        {isToday
                                            ? t('schedule.todayLabel', {
                                                  label: shortDate(day.date),
                                              })
                                            : shortDate(day.date)}
                                    </td>
                                    <td>
                                        <Ranges ranges={day.listings} tone="info" />
                                    </td>
                                    <td>
                                        <Ranges ranges={day.removals} tone="bad" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
