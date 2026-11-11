/* 預覽「上下架批次」表（mockup ⑨ table）：日期 / 上架 / 下架，集數範圍用 pill（藍 = 上架、紅 = 下架） */
import type { EpisodeRange } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { shortDate } from '../../model/dates';
import { Pill } from '../../ui/Pill';
import { rangeText, type PreviewDay } from './timelineModel';

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

export function BatchTable({ days }: { days: readonly PreviewDay[] }) {
    return (
        <div className="note warn batch-note">
            <b>{t('schedule.batches')}</b>
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
                        {days.map((day) => (
                            <tr key={day.date}>
                                <td>{shortDate(day.date)}</td>
                                <td>
                                    <Ranges ranges={day.listings} tone="info" />
                                </td>
                                <td>
                                    <Ranges ranges={day.removals} tone="bad" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
