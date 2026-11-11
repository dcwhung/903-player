/*
 * 列表圖例（3c）：縮圖右上角圓點用真顏色點、標記 pill 解釋意思；「拖曳調整次序」另起一行。
 * 廣播劇：綠 上架中 · 藍 上架日期未到 · 紅 已下架 + 待發佈 / 新；節目：綠 / 紅 + 待發佈
 */
import type { Dot } from '../../model/status';
import { t, type MessageKey } from '../../i18n/t';
import { Pill } from '../../ui/Pill';

const DOT_LABEL: Record<Dot, MessageKey> = {
    live: 'list.legendLive',
    soon: 'list.legendSoon',
    off: 'list.legendOff',
};

interface ListLegendProps {
    dots: readonly Dot[];
    /** 顯示「新 = 從未發佈的短篇」（廣播劇） */
    newArcs?: boolean;
}

export function ListLegend({ dots, newArcs = false }: ListLegendProps) {
    return (
        <div className="legend" role="group" aria-label={t('list.legendLabel')}>
            {dots.map((dot) => (
                <span key={dot} className="legend-item">
                    <span className={`dot ${dot}`} aria-hidden="true" />
                    {t(DOT_LABEL[dot])}
                </span>
            ))}
            <span className="legend-item">
                <Pill tone="draft">{t('status.pending')}</Pill>
                {t('list.legendPending')}
            </span>
            {newArcs && (
                <span className="legend-item">
                    <Pill tone="new">{t('status.newArc')}</Pill>
                    {t('list.legendNew')}
                </span>
            )}
            <span className="legend-line">{t('list.legendDrag')}</span>
        </div>
    );
}
