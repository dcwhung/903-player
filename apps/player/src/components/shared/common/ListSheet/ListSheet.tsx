import { useCallback, useId, type ReactNode, type RefObject } from 'react';
import type { InfoBanner as InfoBannerData } from '../../../../selectors/itemInfo';
import { SheetOverlay } from '../Sheet/SheetOverlay';
import motion from '../Sheet/SheetMotion.module.css';
import { useSheetBehaviour } from '../Sheet/useSheetBehaviour';
import { useSheetPresence } from '../Sheet/useSheetPresence';
import { ListSheetHeader } from './ListSheetHeader';
import styles from './ListSheet.module.css';

/** 清單入面真正捲動嘅 panel（例如 EpisodeList 嘅 ul）；冇就係包住清單嗰層自己捲 */
const SCROLL_PANEL = '[data-sheet-scroll]';

/** 向下拉閂要睇捲動 panel 捲咗未（捲到頂先由表接手）：搵入面標咗 data-sheet-scroll 嘅 */
const scrollPanelOf = (wrapper: HTMLElement | null): HTMLElement | null =>
    wrapper?.querySelector<HTMLElement>(SCROLL_PANEL) ?? wrapper;

interface ListSheetProps {
    open: boolean;
    onClose: () => void;
    /** 表頭標題（例如「集數」）：亦係 dialog 嘅名 */
    title: string;
    /** 標題旁邊嘅細字（例如「共 4 集」） */
    summary?: string | undefined;
    /** ✕ 讀屏名（預設「關閉清單」） */
    closeLabel?: string | undefined;
    /** 清單本身（例如 EpisodeList heading={false}）：表入面唯一捲動嘅 panel */
    children: ReactNode;
    /** 自動開（冇撳過掣，例如由「我的收藏」入頁）閂咗焦點返去邊（通常係頁頭清單掣） */
    returnFocusTo?: RefObject<HTMLElement | null> | undefined;
    /** 表頂 banner（例如 HomeView 短篇表：劇集橫額 + 短篇名）：✕ 疊喺圖上 */
    banner?: InfoBannerData | undefined;
    /** 表頭右邊嘅掣（例如短篇表「全集」） */
    action?: ReactNode;
}

/**
 * 清單 sheet（HomeView，P10 lane 6，_mockups_/home-view 節目頁）：由畫面底升起，蓋住播放器下半；
 * 閂：✕、撳遮罩、Escape、向下拉（同全集表 ArcSheet 一樣，useSheetBehaviour），再撳頁頭清單掣
 * 喺遮罩上面都閂到。開 / 閂動畫同全集表共用（useSheetPresence + SheetMotion.module.css），
 * 減少動態即刻切換。開咗焦點入表，閂咗返去清單掣（自動開嘅就靠 returnFocusTo）
 */
export const ListSheet = ({
    open,
    onClose,
    title,
    summary,
    closeLabel,
    children,
    returnFocusTo,
    banner,
    action,
}: ListSheetProps) => {
    const titleId = useId();
    const { setSheet, backdropRef, listRef, handlers } = useSheetBehaviour(
        open,
        onClose,
        returnFocusTo,
    );
    const bindList = useCallback((el: HTMLElement | null) => listRef(scrollPanelOf(el)), [listRef]);
    const { mounted, state, inert, overlayRef } = useSheetPresence(open);
    if (!mounted) return null;
    const backdrop = {
        className: styles.backdrop,
        testId: 'list-sheet-backdrop',
        onClick: onClose,
    };
    return (
        <SheetOverlay
            {...{ state, inert, overlayRef, backdropRef, backdrop }}
            className={styles.overlay ?? ''}
        >
            <section
                ref={setSheet}
                className={`${styles.sheet} ${motion.sheet}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                data-banner={banner !== undefined}
                tabIndex={-1}
                {...handlers}
            >
                <ListSheetHeader
                    {...{ titleId, title, summary, closeLabel, onClose, banner, action }}
                />
                <div ref={bindList} className={styles.list} data-role="sheet-list">
                    {children}
                </div>
            </section>
        </SheetOverlay>
    );
};
