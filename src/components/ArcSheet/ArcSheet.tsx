import { useId } from 'react';
import { t } from '../../i18n/t';
import type { ArcGroup, ArcSummary } from '../../selectors/arcProgress';
import { CloseIcon } from '../icons/icons';
import { GROUP_TITLES } from './arcLabels';
import { ArcRow, type ArcRowProps } from './ArcRow';
import styles from './ArcSheet.module.css';
import { useSheetBehaviour } from './useSheetBehaviour';

interface ArcSheetProps extends Omit<ArcRowProps, 'summary'> {
    open: boolean;
    /**
     * 橫版：表只蓋住清單欄（父層要 position: relative），冇遮罩、唔係 modal，旁邊播放器照撳得；
     * 直版（預設）由畫面底彈出蓋全頁
     */
    docked?: boolean;
    /** 分好組嘅短篇（播放中 → 新上架 → 未聽完 → 已聽完，見 arcGroups） */
    groups: readonly { group: ArcGroup; items: readonly ArcSummary[] }[];
    onClose: () => void;
}

const CLOSE_ICON_SIZE = 20;

/** 一組：細標題（播放中 / 新上架 / 未聽完 / 已聽完）+ 嗰組嘅短篇 */
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

/** 表頭「聽完 N / M 個」 */
const sheetProgress = (groups: ArcSheetProps['groups']) => {
    const all = groups.flatMap((g) => g.items);
    return { done: all.filter((s) => s.state === 'done').length, total: all.length };
};

/**
 * 全集一覽表（底部彈出）：分組 播放中 → 新上架 → 未聽完 → 已聽完，圓環 = 聽完幾多集；
 * 撳行轉去嗰個短篇，撳右邊掣直接播（續聽 / 未收聽 / ↺ 重聽）。
 * 閂：✕ 掣、撳遮罩、Escape，或者向下拉（grab bar / header；清單捲到頂都得，直版橫版一樣）。
 * 見 design/previews/drama-flow-preview.html；橫版 docked 見 landscape-list-left-preview.html
 */
export const ArcSheet = ({ open, docked = false, groups, onClose, ...rowProps }: ArcSheetProps) => {
    const titleId = useId();
    const { setSheet, backdropRef, listRef, handlers } = useSheetBehaviour(open, onClose);
    if (!open) return null;
    const progress = sheetProgress(groups);
    return (
        <div className={`${styles.overlay} ${docked ? styles.docked : ''}`}>
            {!docked && (
                <div
                    ref={backdropRef}
                    className={styles.backdrop}
                    data-testid="arc-sheet-backdrop"
                    onClick={onClose}
                />
            )}
            <section
                ref={setSheet}
                className={styles.sheet}
                role="dialog"
                aria-modal={!docked}
                aria-labelledby={titleId}
                tabIndex={-1}
                {...handlers}
            >
                <span className={styles.grab} aria-hidden="true" />
                <header className={styles.header}>
                    <h2 id={titleId} className={styles.title}>
                        {t('drama.sheetTitle')}
                    </h2>
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
                <div ref={listRef} className={styles.list} data-role="sheet-list">
                    {groups.map((g) => (
                        <ArcGroupBlock key={g.group} {...g} {...rowProps} />
                    ))}
                </div>
            </section>
        </div>
    );
};
