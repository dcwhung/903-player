/*
 * 一句話規則（mockup ⑧）：
 * 上架「由 ⟨日期⟩ 起，逢 ⟨星期⟩，每次上架 ⟨N⟩ 集」/「於 ⟨日期⟩ 一次性全部上架」；
 * 下架「於 ⟨日期⟩ 全部下架」/「每集上架 ⟨N⟩ 日後下架」/「由 ⟨日期⟩ 起，逢 ⟨星期⟩，每次下架 ⟨N⟩ 集」
 */
import { t } from '../../i18n/t';
import {
    CadenceSentence,
    DateField,
    LISTING_LABELS,
    positive,
    UNLIST_LABELS,
} from './CadenceSentence';
import type { ListingForm, UnlistForm } from './scheduleModel';

/** 「上架 N 日後」上限：同 catalog MAX_SCHEDULE_DAYS（約 10 年） */
const MAX_AFTER_DAYS = 3660;

export function ListingSentence({
    listing,
    min,
    onChange,
}: {
    listing: ListingForm;
    /** 已上架最後一批之後先可以再上架 */
    min?: string | undefined;
    onChange: (listing: ListingForm) => void;
}) {
    if (listing.mode === 'done') return null;
    if (listing.mode === 'custom')
        return (
            <p className="sentence">
                {t('schedule.customSentence', { count: listing.batches.length })}
            </p>
        );
    if (listing.mode === 'periodic')
        return (
            <CadenceSentence form={listing} labels={LISTING_LABELS} min={min} onChange={onChange} />
        );
    return (
        <p className="sentence">
            {t('schedule.on')}{' '}
            <DateField
                label="schedule.listAllLabel"
                value={listing.start}
                min={min}
                onChange={(start) => onChange({ ...listing, start })}
            />{' '}
            {t('schedule.listAll')}
        </p>
    );
}

export function UnlistSentence({
    unlist,
    onChange,
}: {
    unlist: UnlistForm;
    onChange: (unlist: UnlistForm) => void;
}) {
    if (unlist.mode === 'none') return <p className="muted small">{t('schedule.unlistKeep')}</p>;
    if (unlist.mode === 'periodic')
        return <CadenceSentence form={unlist} labels={UNLIST_LABELS} onChange={onChange} />;
    if (unlist.mode === 'afterDays')
        return (
            <p className="sentence">
                {t('schedule.unlistAfterPrefix')}{' '}
                <input
                    className="inline-ctl"
                    type="number"
                    min={1}
                    max={MAX_AFTER_DAYS}
                    aria-label={t('schedule.unlistDaysLabel')}
                    value={unlist.days}
                    onChange={(e) =>
                        onChange({ ...unlist, days: positive(e.target.value, MAX_AFTER_DAYS) })
                    }
                />{' '}
                {t('schedule.unlistAfterSuffix')}
            </p>
        );
    return (
        <p className="sentence">
            {t('schedule.on')}{' '}
            <DateField
                label="schedule.unlistDateLabel"
                value={unlist.date}
                onChange={(date) => onChange({ ...unlist, date })}
            />{' '}
            {t('schedule.unlistAll')}
        </p>
    );
}
