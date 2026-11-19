import { useCallback, useId, useRef, type ReactNode } from 'react';
import { t } from '../../../../i18n/t';
import styles from './EpisodeList.module.css';
import { EpisodeRow } from './EpisodeRow';
import type {
    EpisodeItem,
    EpisodeLabels,
    EpisodeListVariant,
    EpisodeScrollAlign,
} from './episodeListTypes';
import { useFocusRow } from './useFocusRow';
import { useScrollToCurrent } from './useScrollToCurrent';

// 型別喺 episodeListTypes（EpisodeRow 都用，免循環）；re-export 令 pages/ 舊 import 路徑照用
export type {
    EpisodeItem,
    EpisodeLabels,
    EpisodeListVariant,
    EpisodeScrollAlign,
} from './episodeListTypes';

interface EpisodeListProps {
    items: EpisodeItem[];
    onSelect: (key: string) => void;
    labels?: EpisodeLabels;
    scrollAlign?: EpisodeScrollAlign;
    /** 由「我的收藏」撳入嚟嗰集（網址）：捲過去、短暫 highlight，唔播 */
    focusKey?: string;
    /** 擺喺邊（預設 page）；主頁播放卡傳 card */
    variant?: EpisodeListVariant;
    /**
     * 「集數 / 共 N 集」標題列（預設有）；HomeView 清單 sheet（ListSheet）傳 false：
     * 表頭已經有同一句（episodeCountText），唔重複
     */
    heading?: boolean;
    /**
     * 「集數 / 共 N 集」上面嘅嘢（節目頁 / 每日劇：資料 sheet 嘅 banner，v2.0.1 用戶反饋）：
     * 同清單一齊捲（捲動 panel 由 ul 換做包住 banner + 標題列 + ul 嗰層），唔食清單預留嘅行數
     */
    top?: ReactNode;
}

/** 一行代表幾多集：摺埋嘅未上架批次係成批（短篇劇「共 30 集」照寫），其他一行一集 */
const episodesIn = (item: EpisodeItem): number => item.episodeCount ?? 1;

const unavailableCount = (items: EpisodeItem[]): number =>
    items.filter((item) => item.status.kind === 'unavailable').length;

/** 播得到幾多集（短篇劇未上架批次照計）：「共 N 集」同 HomeView 清單掣 badge 用 */
export const episodeCount = (items: EpisodeItem[]): number =>
    items.reduce((sum, item) => sum + episodesIn(item), 0) - unavailableCount(items);

/** 標題右邊：「共 N 集」只計播得到嘅（短篇劇未上架批次照計）；有試過但未上架嘅就加埋幾多集 */
export const episodeCountText = (items: EpisodeItem[]): string => {
    const unavailable = unavailableCount(items);
    const count = episodeCount(items);
    return unavailable > 0
        ? t('episodes.countWithUnavailable', { count, unavailable })
        : t('episodes.count', { count });
};

/** 「集數 / 共 N 集」標題列 */
const ListHeading = ({ id, items }: { id: string; items: EpisodeItem[] }) => (
    <div className={styles.header}>
        <h2 id={id} className={styles.heading}>
            {t('episodes.title')}
        </h2>
        <span>{episodeCountText(items)}</span>
    </div>
);

interface EpisodeRowsProps {
    items: EpisodeItem[];
    onSelect: (key: string) => void;
    /** 冇 top：ul 自己係捲動 panel（傳 bindPanel）；有 top 就由外面嗰層捲 */
    panelRef: ((el: HTMLElement | null) => void) | undefined;
}

/** 每集一行；data-sheet-scroll：喺 ListSheet 入面，表要知邊個係捲動 panel（捲到頂先向下拉閂） */
const EpisodeRows = ({ items, onSelect, panelRef }: EpisodeRowsProps) => (
    <ul ref={panelRef} className={styles.list} data-sheet-scroll={panelRef ? '' : undefined}>
        {items.map((item) => (
            <li key={item.key} className={styles.item} data-episode-key={item.key}>
                <EpisodeRow item={item} onSelect={onSelect} />
            </li>
        ))}
    </ul>
);

/** 捲動 panel 嘅 ref：callback 綁去 ul 或者外面嗰層（兩款元素都得），hooks 用 ref 物件 */
const usePanelRef = () => {
    const panelRef = useRef<HTMLElement | null>(null);
    const bindPanel = useCallback((el: HTMLElement | null) => {
        panelRef.current = el;
    }, []);
    return { panelRef, bindPanel };
};

/**
 * 集數清單：最新喺頂（節目頁）/ 照集數次序（短篇劇集），每集有進度同狀態。
 * 清單本身係頁面唯一捲動嘅 panel；有 top（banner）就 top + 標題列 + 清單成組一齊捲
 */
export const EpisodeList = ({
    items,
    onSelect,
    labels = 'date',
    scrollAlign = 'nearest',
    focusKey,
    variant = 'page',
    heading = true,
    top,
}: EpisodeListProps) => {
    const headingId = useId();
    const { panelRef, bindPanel } = usePanelRef();
    useScrollToCurrent(panelRef, items, scrollAlign);
    useFocusRow(panelRef, items, focusKey, scrollAlign);
    const scrolled = top !== undefined;
    const header = heading && <ListHeading id={headingId} items={items} />;
    const rows = (
        <EpisodeRows
            items={items}
            onSelect={onSelect}
            panelRef={scrolled ? undefined : bindPanel}
        />
    );

    return (
        <section
            className={styles.section}
            aria-labelledby={heading ? headingId : undefined}
            data-labels={labels}
            data-variant={variant}
        >
            {scrolled ? (
                <div ref={bindPanel} className={styles.scroller} data-sheet-scroll="">
                    <div className={styles.top}>{top}</div>
                    {header}
                    {rows}
                </div>
            ) : (
                <>
                    {header}
                    {rows}
                </>
            )}
        </section>
    );
};
