import { t } from '../../../../i18n/t';
import type { ArcSummary } from '../../../../selectors/arcProgress';
import type { InfoBanner as InfoBannerData } from '../../../../selectors/itemInfo';
import { InfoBanner } from '../../../shared/common/ItemInfo/InfoBanner';
import { CloseIcon, HourglassIcon } from '../../../shared/common/icons/icons';
import { InfoToggle } from '../../../shared/common/ItemInfo/InfoToggle';
import { SpokenText, type SpokenNotice } from '../../../shared/common/SpokenText/SpokenText';
import styles from './ArcSheet.module.css';
import type { ArcSheetInfo } from './arcSheetTypes';

const CLOSE_ICON_SIZE = 20;
const NOTICE_ICON_SIZE = 12;

/** 表頭「聽完 N / M 個」 */
export const sheetProgress = (groups: readonly { items: readonly ArcSummary[] }[]) => {
    const all = groups.flatMap((g) => g.items);
    return { done: all.filter((s) => s.state === 'done').length, total: all.length };
};

interface SheetHeaderProps {
    titleId: string;
    progress: ReturnType<typeof sheetProgress>;
    notice: SpokenNotice | undefined;
    info: ArcSheetInfo | undefined;
    /** 劇集 banner（G1）：貼表頂，grab bar 疊喺圖上（CSS data-banner）；表頭喺佢下面 */
    banner: InfoBannerData | undefined;
    onClose: () => void;
}

/**
 * 表頂：（劇集 banner +）grab bar + 表頭「全集」（+ 劇集資料箭咀）+「聽完 N / M 個」+ ✕；
 * 成套劇快將下架就下面加一行琥珀字
 */
export const SheetHeader = ({
    titleId,
    progress,
    notice,
    info,
    banner,
    onClose,
}: SheetHeaderProps) => (
    <>
        {banner && <InfoBanner banner={banner} />}
        <span className={styles.grab} aria-hidden="true" />
        <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
                {t('drama.sheetTitle')}
            </h2>
            {info && (
                <InfoToggle
                    expanded={info.expanded}
                    label={t('info.dramaInfo')}
                    onToggle={info.onToggle}
                />
            )}
            <span className={styles.summary}>{t('drama.sheetDone', progress)}</span>
            <button
                type="button"
                className={styles.close}
                aria-label={t('drama.sheetClose')}
                onClick={onClose}
            >
                <CloseIcon size={CLOSE_ICON_SIZE} />
            </button>
        </header>
        {notice && (
            <p className={styles.notice}>
                <HourglassIcon size={NOTICE_ICON_SIZE} />
                <SpokenText {...notice} />
            </p>
        )}
    </>
);
