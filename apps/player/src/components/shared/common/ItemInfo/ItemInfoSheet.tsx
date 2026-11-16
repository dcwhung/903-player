import { useCallback, useEffect, useRef } from 'react';
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

/** 打開資料 sheet 嗰粒 ⓘ（GaugeInfoRow）：橫版撳佢唔當「撳咗左欄」 */
export const INFO_OPENER_ATTR = 'data-info-opener';
/** 撳落呢啲先當「撳咗左欄嘅掣」；撳空白位 / 純文字唔閂 */
const PRESSABLE_SELECTOR =
    'button, a[href], [role="button"], [role="link"], [role="tab"], [role="option"], input, select, textarea, label, summary';

/**
 * 橫版右欄 sheet 冇遮罩：sheet 開住時撳左欄任何掣（集數播放 / 收藏、日子條、短篇 chip、全集、返回…）就閂。
 * 用 capture：掣自己 stopPropagation 都收到；撳 sheet 入面同 ⓘ 唔理
 */
const useCloseOnOutsidePress = (enabled: boolean, onClose: () => void) => {
    const sheetRef = useRef<HTMLElement | null>(null);
    // 同 W-747 一樣：caller 每秒 re-render 傳新 onClose，唔好因此重掛 listener
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);
    useEffect(() => {
        if (!enabled) return undefined;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target || sheetRef.current?.contains(target)) return;
            if (target.closest(`[${INFO_OPENER_ATTR}]`)) return;
            if (target.closest(PRESSABLE_SELECTOR)) onCloseRef.current();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, [enabled]);
    return sheetRef;
};

/** 一段（節目 / 劇集 / 短篇）：data-kind 畀 CSS 揀標題大細（短篇細過劇集名） */
const InfoSection = ({ section }: { section: ItemInfoSection }) => (
    <section className={styles.section} data-kind={section.kind}>
        <h2 className={styles.title}>{section.title}</h2>
        <ItemInfoFields section={section} />
    </section>
);

/**
 * 節目 / 劇集資料 sheet（P9.5 #12，_mockups_/catalog-item-info A 修訂版）：
 * 標題 → 播放時間 → 主持 → 聲演 → 簡介，每段之間一條線。
 * 閂：✕、撳遮罩、Escape、向下拉（同全集 sheet 一樣用 useSheetBehaviour）；
 * 橫版（docked）冇遮罩，改為撳左欄任何掣就閂
 */
export const ItemInfoSheet = ({
    open,
    docked = false,
    sections,
    label,
    onClose,
}: ItemInfoSheetProps) => {
    const { setSheet, backdropRef, listRef, handlers } = useSheetBehaviour(open, onClose);
    const outsideRef = useCloseOnOutsidePress(open && docked, onClose);
    // 穩定 callback ref：播放時每秒 re-render 唔可以令 useSheetDrag 重掛
    const bindSheet = useCallback(
        (el: HTMLElement | null) => {
            setSheet(el);
            outsideRef.current = el;
        },
        [setSheet, outsideRef],
    );
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
                        // S-1018：每種段落最多一段，用類型做 key（短篇名同劇集名一樣都唔撞）
                        <InfoSection key={section.kind} section={section} />
                    ))}
                </div>
            </section>
        </div>
    );
};
