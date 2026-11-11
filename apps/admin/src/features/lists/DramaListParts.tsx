/* 廣播劇列表表頭 + 圖例（mockup ⑤ .drama-head / .legend） */
import { t } from '../../i18n/t';
import { Pill } from '../../ui/Pill';

export function DramaListHead() {
    return (
        <div className="drama-head" aria-hidden="true">
            <span />
            <span>{t('list.colName')}</span>
            <span>{t('list.colArcs')}</span>
            <span className="eps">{t('list.colEpisodes')}</span>
            <span>{t('list.colStatus')}</span>
        </div>
    );
}

export function DramaLegend() {
    return (
        <div className="legend">
            <span>
                <Pill tone="draft">{t('status.pending')}</Pill>
            </span>
            <span>
                <Pill tone="new">{t('status.newArc')}</Pill>
            </span>
            <span>{t('list.legendDot')}</span>
            <span>{t('list.legendDrag')}</span>
        </div>
    );
}
