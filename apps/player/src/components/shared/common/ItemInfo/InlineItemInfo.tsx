import { t } from '../../../../i18n/t';
import type { InlineInfo } from '../../../../selectors/itemInfo';
import { InfoChips } from './InfoChips';
import styles from './InlineItemInfo.module.css';

interface InlineItemInfoProps {
    info: InlineInfo;
    expanded: boolean;
}

/**
 * 列表行展開嘅資料（全集 sheet 短篇行、今日節目行）：左邊細直線入面，播放時間、主持 / 聲演 chip、簡介。
 * 用 grid-template-rows 0fr → 1fr 展開（唔用 JS 量高度）；收埋時 inert，Tab / 讀屏都唔會入去
 */
export const InlineItemInfo = ({ info, expanded }: InlineItemInfoProps) => {
    const { airTime, hosts, cast, summary } = info;
    if (!airTime && !hosts && !cast && !summary) return null;
    return (
        <div
            className={styles.collapse}
            data-expanded={expanded}
            inert={!expanded}
            aria-hidden={!expanded}
        >
            <div className={styles.clip}>
                <div className={styles.info} data-role="item-info">
                    {airTime && <p className={styles.airTime}>{airTime}</p>}
                    {hosts && <InfoChips label={t('info.hosts')} names={hosts} layout="inline" />}
                    {cast && <InfoChips label={t('info.cast')} names={cast} layout="inline" />}
                    {summary && <p className={styles.summary}>{summary}</p>}
                </div>
            </div>
        </div>
    );
};
