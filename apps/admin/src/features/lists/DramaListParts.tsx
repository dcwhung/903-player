/* 廣播劇列表表頭（mockup ⑤ .drama-head）；圖例直接用 ListLegend（S-824） */
import { t } from '../../i18n/t';

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
