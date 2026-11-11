/*
 * 集數條（mockup ⑩ C）：已上架批次灰格 ✓ 日期一行（下架又冇排程 = 「未上架」）；「今天」換行，之後係新批次（虛線分隔）
 */
import type { EpisodeRange } from '@903-player/catalog';
import { t } from '../../i18n/t';
import { shortDate } from '../../model/dates';
import type { Strip } from './stripModel';

function Batch({ batch, tone }: { batch: EpisodeRange; tone: 'past' | 'b1' | 'b2' }) {
    const nos = Array.from({ length: batch.last - batch.first + 1 }, (_, i) => batch.first + i);
    return (
        <div className={`seg-batch ${tone}`}>
            <div className="eps-cells" aria-hidden="true">
                {nos.map((no) => (
                    <span key={no}>{no}</span>
                ))}
            </div>
            <span className="seg-date">
                {tone === 'past' ? `✓ ${shortDate(batch.date)}` : shortDate(batch.date)}
                <span className="sr-only">{` ${t('schedule.episodesRange', { first: batch.first, last: batch.last })}`}</span>
            </span>
        </div>
    );
}

export function EpisodeStrip({ strip, count }: { strip: Strip; count: number }) {
    return (
        <>
            {strip.unreleased && (
                <p className="strip-unreleased" role="status">
                    {t('schedule.unreleased')}
                </p>
            )}
            {strip.past.length > 0 && (
                <div
                    className="strip"
                    role="group"
                    aria-label={t('schedule.stripLabel', { count })}
                >
                    {strip.past.map((batch) => (
                        <Batch key={batch.first} batch={batch} tone="past" />
                    ))}
                </div>
            )}
            <div className="strip future" role="group" aria-label={t('schedule.futureLabel')}>
                <div className="today-mark">{t('schedule.today')}</div>
                {strip.future.map((batch, i) => (
                    <Batch
                        key={`${batch.first}-${batch.date}`}
                        batch={batch}
                        tone={i % 2 === 0 ? 'b1' : 'b2'}
                    />
                ))}
            </div>
            <div className="legend">
                <span>{t('schedule.legendPast')}</span>
                <span>{t('schedule.legendToday')}</span>
            </div>
        </>
    );
}
