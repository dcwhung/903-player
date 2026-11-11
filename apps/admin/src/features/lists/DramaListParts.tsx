/* 廣播劇列表表頭 + 圖例（mockup ⑤ .drama-head / .legend；3c 圖例改真顏色點） */
import { t } from '../../i18n/t';
import { ListLegend } from './ListLegend';

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
    return <ListLegend dots={['live', 'soon', 'off']} newArcs />;
}
