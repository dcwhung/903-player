/*
 * 列表圖例（3c，節目 / 廣播劇共用），三行：
 * ① 縮圖右上角圓點（真顏色）② 標記 pill + 意思（待發佈、新）③ ⠿ icon + 拖曳調整次序。
 * ① ② 淨係列表入面真係有嘅先出（legendOf）；冇就成行唔出；③ 永遠出
 */
import { GripVertical } from 'lucide-react';
import type { Dot } from '../../model/status';
import { t, type MessageKey } from '../../i18n/t';
import type { Legend } from './legendModel';
import { Pill } from '../../ui/Pill';

const DOT_LABEL: Record<Dot, MessageKey> = {
    live: 'list.legendLive',
    soon: 'list.legendSoon',
    off: 'list.legendOff',
};

export function ListLegend({ legend }: { legend: Legend }) {
    const { dots, pending, newArcs } = legend;
    return (
        <div className="legend" role="group" aria-label={t('list.legendLabel')}>
            {dots.length > 0 && (
                <span className="legend-line">
                    {dots.map((dot) => (
                        <span key={dot} className="legend-item">
                            <span className={`dot ${dot}`} aria-hidden="true" />
                            {t(DOT_LABEL[dot])}
                        </span>
                    ))}
                </span>
            )}
            {(pending || newArcs) && (
                <span className="legend-line">
                    {pending && (
                        <span className="legend-item">
                            <Pill tone="draft">{t('status.pending')}</Pill>
                            {t('list.legendPending')}
                        </span>
                    )}
                    {newArcs && (
                        <span className="legend-item">
                            <Pill tone="new">{t('status.newArc')}</Pill>
                            {t('list.legendNew')}
                        </span>
                    )}
                </span>
            )}
            <span className="legend-line legend-item">
                <GripVertical aria-hidden="true" />
                {t('list.legendDrag')}
            </span>
        </div>
    );
}
