import { useId, type Ref } from 'react';
import { t } from '../../../../i18n/t';
import type { ArcGroup, ArcSummary } from '../../../../selectors/arcProgress';
import type { InfoBanner as InfoBannerData } from '../../../../selectors/itemInfo';
import { DramaSummaryCard } from '../../../shared/common/ItemInfo/DramaSummaryCard';
import type { SpokenNotice } from '../../../shared/common/SpokenText/SpokenText';
import { GROUP_TITLES } from './arcLabels';
import { SheetHeader, sheetProgress } from './ArcSheetHeader';
import { ArcRow, type ArcRowProps } from './ArcRow';
import styles from './ArcSheet.module.css';
import type { ArcSheetInfo, UpcomingArcRowView } from './arcSheetTypes';
import { UpcomingArcGroup } from './UpcomingArcRow';
import { useSheetBehaviour } from '../../../shared/common/Sheet/useSheetBehaviour';
import { SheetOverlay } from '../../../shared/common/Sheet/SheetOverlay';
import { useSheetPresence } from '../../../shared/common/Sheet/useSheetPresence';
import motion from '../../../shared/common/Sheet/SheetMotion.module.css';

type RowProps = Omit<ArcRowProps, 'summary' | 'infoOf' | 'infoExpanded'>;

interface ArcSheetProps extends RowProps {
    open: boolean;
    /**
     * 橫版：表只蓋住清單欄（父層要 position: relative），冇遮罩、唔係 modal，旁邊播放器照撳得；
     * 直版（預設）由畫面底彈出蓋全頁
     */
    docked?: boolean;
    /** 分好組嘅短篇（播放中 → 新上架 → 未聽完 → 已收聽，見 arcGroups） */
    groups: readonly { group: ArcGroup; items: readonly ArcSummary[] }[];
    /** 即將上架嘅短篇：最底一組（S1），撳唔到 */
    upcoming?: readonly UpcomingArcRowView[] | undefined;
    /** 成套劇快將下架：表頭下面一行琥珀字（畫面字 + 讀屏字，W-537） */
    notice?: SpokenNotice | undefined;
    /** 劇集 / 短篇資料（P9.5 #12）：成套劇有資料先傳，「全集」旁邊出箭咀 */
    info?: ArcSheetInfo | undefined;
    /** 頂部劇集 banner（G1）：固定喺表頂（唔跟清單捲），表頭喺佢下面；冇圖就唔出 */
    banner?: InfoBannerData | undefined;
    onClose: () => void;
}

/** 一組：細標題（播放中 / 新上架 / 未聽完 / 已收聽）+ 嗰組嘅短篇 */
const ArcGroupBlock = ({
    group,
    items,
    ...rowProps
}: ArcSheetProps['groups'][number] & Omit<ArcRowProps, 'summary'>) => {
    const headingId = useId();
    return (
        <section aria-labelledby={headingId}>
            <h3 id={headingId} className={styles.groupTitle}>
                {t(GROUP_TITLES[group])}
            </h3>
            <ul className={styles.groupList}>
                {items.map((s) => (
                    <ArcRow key={s.arc} summary={s} {...rowProps} />
                ))}
            </ul>
        </section>
    );
};

interface SheetListProps {
    listRef: Ref<HTMLDivElement>;
    groups: ArcSheetProps['groups'];
    upcoming: readonly UpcomingArcRowView[];
    info: ArcSheetInfo | undefined;
    rowProps: RowProps;
}

/** 唯一捲動嘅清單：（劇集簡介卡 +）各組短篇 + 即將上架組；展開資料時每行出聲演 / 簡介 */
const SheetList = ({ listRef, groups, upcoming, info, rowProps }: SheetListProps) => (
    <div ref={listRef} className={styles.list} data-role="sheet-list">
        {info?.dramaSummary && (
            <DramaSummaryCard summary={info.dramaSummary} expanded={info.expanded} />
        )}
        {groups.map((g) => (
            <ArcGroupBlock
                key={g.group}
                {...g}
                {...rowProps}
                infoOf={info?.arcInfoOf}
                infoExpanded={info?.expanded}
            />
        ))}
        <UpcomingArcGroup rows={upcoming} />
    </div>
);

/**
 * 全集一覽表（底部彈出）：分組 播放中 → 新上架 → 未聽完 → 已收聽，圓環 = 聽完幾多集；
 * 撳行轉去嗰個短篇，撳右邊掣直接播（續聽 / 未收聽 / ↺ 重聽）。
 * 頂部劇集 banner（G1，有圖先出）。閂：✕ 掣、撳遮罩、Escape，或者向下拉（banner / grab bar / header；
 * 清單捲到頂都得，直版橫版一樣）。開 / 閂都由底滑上 / 滑落（useSheetPresence + SheetMotion.module.css）。
 * 見 design/previews/drama-flow-preview.html；橫版 docked 見 landscape-list-left-preview.html
 */
export const ArcSheet = ({
    open,
    docked = false,
    groups,
    upcoming = [],
    notice,
    info,
    banner,
    onClose,
    ...sheetRowProps
}: ArcSheetProps) => {
    const titleId = useId();
    const { setSheet, backdropRef, listRef, handlers } = useSheetBehaviour(open, onClose);
    const { mounted, state, inert, overlayRef } = useSheetPresence(open);
    if (!mounted) return null;
    const backdrop = { className: styles.backdrop, testId: 'arc-sheet-backdrop', onClick: onClose };
    return (
        <SheetOverlay
            {...{ state, inert, overlayRef, backdropRef }}
            className={`${styles.overlay} ${docked ? styles.docked : ''}`}
            backdrop={docked ? undefined : backdrop}
        >
            <section
                ref={setSheet}
                className={`${styles.sheet} ${motion.sheet}`}
                role="dialog"
                aria-modal={!docked}
                aria-labelledby={titleId}
                data-banner={banner !== undefined}
                tabIndex={-1}
                {...handlers}
            >
                <SheetHeader
                    titleId={titleId}
                    progress={sheetProgress(groups)}
                    {...{ notice, info, banner }}
                    onClose={onClose}
                />
                <SheetList
                    listRef={listRef}
                    {...{ groups, upcoming, info }}
                    rowProps={sheetRowProps}
                />
            </section>
        </SheetOverlay>
    );
};
