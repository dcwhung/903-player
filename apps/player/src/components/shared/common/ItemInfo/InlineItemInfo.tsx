import { t } from '../../../../i18n/t';
import type { InlineInfo } from '../../../../selectors/itemInfo';
import { Collapse } from './Collapse';
import { InfoChips } from './InfoChips';
import styles from './InlineItemInfo.module.css';

interface InlineItemInfoProps {
    info: InlineInfo;
    expanded: boolean;
}

/**
 * 列表行展開嘅資料（全集 sheet 短篇行、今日節目行）：左邊細直線入面，播放時間、主持 / 聲演 chip、簡介。
 * 冇資料就乜都唔出
 */
export const InlineItemInfo = ({ info, expanded }: InlineItemInfoProps) => {
    const { airTime, hosts, cast, summary } = info;
    if (!airTime && !hosts && !cast && !summary) return null;
    return (
        <Collapse expanded={expanded}>
            <div className={styles.info} data-role="item-info">
                {airTime && <p className={styles.text}>{airTime}</p>}
                {hosts && <InfoChips label={t('info.hosts')} names={hosts} layout="inline" />}
                {cast && <InfoChips label={t('info.cast')} names={cast} layout="inline" />}
                {summary && <p className={styles.text}>{summary}</p>}
            </div>
        </Collapse>
    );
};
