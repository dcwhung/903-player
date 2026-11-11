/* 上下架批次表（舊批次同新規則排法唔同先出）：日期 / 集數 / 狀態 / 排法（mockup ⑩ table.batches） */
import type { EpisodeRange, ScheduleRule } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { shortDate } from '../../model/dates';
import { Pill } from '../../ui/Pill';
import { describeRule } from './scheduleModel';
import { batchSize, type Strip } from './stripModel';

function Row({ batch, past, pattern }: { batch: EpisodeRange; past: boolean; pattern: string }) {
    return (
        <tr className={past ? 'past' : undefined}>
            <td>{shortDate(batch.date)}</td>
            <td>{t('schedule.episodesRange', { first: batch.first, last: batch.last })}</td>
            <td>
                <Pill tone={past ? 'ok' : 'info'} dot>
                    {past ? t('status.live') : t('status.scheduled')}
                </Pill>
            </td>
            <td className={past ? 'muted' : undefined}>{pattern}</td>
        </tr>
    );
}

export function BatchTable({ strip, rule }: { strip: Strip; rule: ScheduleRule }) {
    return (
        <div className="note warn batch-note">
            <b>{t('schedule.batches')}</b>
            <div className="table-wrap">
                <table className="batches">
                    <thead>
                        <tr>
                            <th scope="col">{t('schedule.colDate')}</th>
                            <th scope="col">{t('schedule.colEpisodes')}</th>
                            <th scope="col">{t('schedule.colStatus')}</th>
                            <th scope="col">{t('schedule.colPattern')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {strip.past.map((b) => (
                            <Row
                                key={`p${b.first}`}
                                batch={b}
                                past
                                pattern={t('schedule.patternEach', { count: batchSize(b) })}
                            />
                        ))}
                        {strip.future.map((b) => (
                            <Row
                                key={`f${b.first}-${b.date}`}
                                batch={b}
                                past={false}
                                pattern={describeRule(rule)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
