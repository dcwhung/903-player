import type { ReactNode } from 'react';
import { t } from '../../../../i18n/t';
import type { InfoBanner as InfoBannerData } from '../../../../selectors/itemInfo';
import { CloseIcon } from '../icons/icons';
import { BANNER_OVERLAY, InfoBanner } from '../ItemInfo/InfoBanner';
import { InfoToggle } from '../ItemInfo/InfoToggle';
import styles from './ListSheet.module.css';

const CLOSE_ICON_SIZE = 20;

interface ListSheetHeaderProps {
    titleId: string;
    title: string;
    summary: string | undefined;
    closeLabel: string | undefined;
    onClose: () => void;
    banner: InfoBannerData | undefined;
    action: ReactNode;
    /** 標題旁邊嘅資料箭咀（ListSheet details）；冇就唔出 */
    toggle: { expanded: boolean; label: string; onToggle: () => void } | undefined;
}

/** ✕：有 banner 就疊喺表右上角（同全集表一樣，BANNER_OVERLAY），冇就喺表頭最右 */
const CloseButton = ({
    label,
    onClose,
    onBanner,
}: {
    label: string | undefined;
    onClose: () => void;
    onBanner: boolean;
}) => (
    <button
        type="button"
        className={`${styles.close} ${onBanner ? BANNER_OVERLAY.close : ''}`}
        aria-label={label ?? t('listSheet.close')}
        data-on-banner={onBanner || undefined}
        onClick={onClose}
    >
        <CloseIcon size={CLOSE_ICON_SIZE} />
    </button>
);

/** 表頂：（banner +）grab bar + 表頭（標題（+ 資料箭咀）+ 細字 +（action）+ ✕） */
export const ListSheetHeader = ({
    titleId,
    title,
    summary,
    closeLabel,
    onClose,
    banner,
    action,
    toggle,
}: ListSheetHeaderProps) => (
    <>
        {banner && (
            <div className={styles.bannerWrap}>
                <InfoBanner banner={banner} />
            </div>
        )}
        <span
            className={`${styles.grab} ${banner ? BANNER_OVERLAY.grab : ''}`}
            data-on-banner={banner ? 'true' : undefined}
            aria-hidden="true"
        />
        {banner && <CloseButton label={closeLabel} onClose={onClose} onBanner />}
        <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
                {title}
            </h2>
            {toggle && <InfoToggle {...toggle} />}
            {summary && <span className={styles.summary}>{summary}</span>}
            {action && <div className={styles.action}>{action}</div>}
            {!banner && <CloseButton label={closeLabel} onClose={onClose} onBanner={false} />}
        </header>
    </>
);
