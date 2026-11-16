import { t } from '../../../../i18n/t';
import type { InfoBanner as InfoBannerData, ItemInfoSection } from '../../../../selectors/itemInfo';
import { useSheetBehaviour } from '../Sheet/useSheetBehaviour';
import { CloseIcon } from '../icons/icons';
import { BANNER_OVERLAY, InfoBanner } from './InfoBanner';
import { InfoSection } from './InfoSection';
import { useCloseOnOutsidePress } from './useCloseOnOutsidePress';
import styles from './ItemInfoSheet.module.css';

interface ItemInfoSheetProps {
    open: boolean;
    /** 橫版：只喺右欄（唱片嗰欄，父層要 position: relative）由底彈出，冇遮罩、唔係 modal，唔蓋左欄清單 */
    docked?: boolean;
    /** 節目 / 劇集 / 短篇，按次序（缺項唔出，見 selectors/itemInfo） */
    sections: readonly ItemInfoSection[];
    /** 頂部 banner（P9.5 #12 v3）：冇（冇圖 / 全集 sheet 以外都冇傳）就用返段標題 */
    banner?: InfoBannerData | undefined;
    /** dialog 讀屏名：「節目資料」/「劇集資料」 */
    label: string;
    onClose: () => void;
}

const CLOSE_ICON_SIZE = 20;

/** sheet 頂：banner（有就貼頂）+ grab bar + ✕（有 banner 就疊喺圖上，見 CSS data-banner） */
const SheetTop = ({
    banner,
    onClose,
}: {
    banner: InfoBannerData | undefined;
    onClose: () => void;
}) => (
    <>
        {banner && <InfoBanner banner={banner} />}
        <span
            className={`${styles.grab} ${banner ? BANNER_OVERLAY.grab : ''}`}
            data-on-banner={banner ? 'true' : undefined}
            aria-hidden="true"
        />
        <button
            type="button"
            className={`${styles.close} ${banner ? BANNER_OVERLAY.close : ''}`}
            data-on-banner={banner ? 'true' : undefined}
            aria-label={t('info.close')}
            onClick={onClose}
        >
            <CloseIcon size={CLOSE_ICON_SIZE} />
        </button>
    </>
);

/**
 * 節目 / 劇集資料 sheet（P9.5 #12，_mockups_/catalog-item-info A 修訂版）：
 * （banner →）標題 → 播放時間 → 主持 → 聲演 → 簡介，每段之間一條線。
 * 閂：✕、撳遮罩、Escape、向下拉（同全集 sheet 一樣用 useSheetBehaviour）；
 * 橫版（docked）冇遮罩，改為撳左欄任何掣就閂
 */
export const ItemInfoSheet = ({
    open,
    docked = false,
    sections,
    banner,
    label,
    onClose,
}: ItemInfoSheetProps) => {
    const { setSheet, backdropRef, listRef, handlers } = useSheetBehaviour(open, onClose);
    const bindSheet = useCloseOnOutsidePress(open && docked, onClose, setSheet);
    if (!open) return null;
    return (
        <div className={`${styles.overlay} ${docked ? styles.docked : ''}`} data-info-sheet="">
            {!docked && (
                <div
                    ref={backdropRef}
                    className={styles.backdrop}
                    data-testid="info-sheet-backdrop"
                    onClick={onClose}
                />
            )}
            <section
                ref={bindSheet}
                className={styles.sheet}
                role="dialog"
                aria-modal={!docked}
                aria-label={label}
                data-banner={banner !== undefined}
                tabIndex={-1}
                {...handlers}
            >
                <SheetTop banner={banner} onClose={onClose} />
                <div ref={listRef} className={styles.body} data-role="sheet-list">
                    {sections.map((section) => (
                        // S-1057：每種段落最多一段，用類型做 key（短篇名同劇集名一樣都唔撞）
                        <InfoSection
                            key={section.kind}
                            section={section}
                            underBanner={section.kind === banner?.kind}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};
