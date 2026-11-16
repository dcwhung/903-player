import { t } from '../../../../i18n/t';
import type { ItemInfoSection } from '../../../../selectors/itemInfo';
import { useSheetBehaviour } from '../Sheet/useSheetBehaviour';
import { CloseIcon } from '../icons/icons';
import { ItemInfoFields } from './ItemInfoFields';
import styles from './ItemInfoSheet.module.css';

interface ItemInfoSheetProps {
    open: boolean;
    /** 橫版：只喺右欄（唱片嗰欄，父層要 position: relative）由底彈出，冇遮罩、唔係 modal，唔蓋左欄清單 */
    docked?: boolean;
    /** 節目 / 劇集 / 短篇，按次序（缺項唔出，見 selectors/itemInfo） */
    sections: readonly ItemInfoSection[];
    /** dialog 讀屏名：「節目資料」/「劇集資料」 */
    label: string;
    onClose: () => void;
}

const CLOSE_ICON_SIZE = 20;

/**
 * 節目 / 劇集資料 sheet（P9.5 #12，_mockups_/catalog-item-info A 修訂版）：
 * 標題 → 播放時間 → 主持 → 聲演 → 簡介，每段之間一條線。
 * 閂：✕、撳遮罩、Escape、向下拉（同全集 sheet 一樣用 useSheetBehaviour）
 */
export const ItemInfoSheet = ({
    open,
    docked = false,
    sections,
    label,
    onClose,
}: ItemInfoSheetProps) => {
    const { setSheet, backdropRef, listRef, handlers } = useSheetBehaviour(open, onClose);
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
                ref={setSheet}
                className={styles.sheet}
                role="dialog"
                aria-modal={!docked}
                aria-label={label}
                tabIndex={-1}
                {...handlers}
            >
                <span className={styles.grab} aria-hidden="true" />
                <button
                    type="button"
                    className={styles.close}
                    aria-label={t('info.close')}
                    onClick={onClose}
                >
                    <CloseIcon size={CLOSE_ICON_SIZE} />
                </button>
                <div ref={listRef} className={styles.body} data-role="sheet-list">
                    {sections.map((section) => (
                        <section key={section.title} className={styles.section}>
                            <h2 className={styles.title}>{section.title}</h2>
                            <ItemInfoFields section={section} />
                        </section>
                    ))}
                </div>
            </section>
        </div>
    );
};
