import type { ReactNode } from 'react';
import { LANDSCAPE_QUERY } from '../../config/layout';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { toPercent } from '../../utils/ratio';
import { PlayIcon } from '../icons/icons';
import { Marquee } from '../Marquee/Marquee';
import { HomeLandscapeGrid } from '../HomeLandscapeGrid/HomeLandscapeGrid';
import { NewBadge } from '../NewBadge/NewBadge';
import { t } from '../../i18n/t';
import styles from './DramaShelf.module.css';
import { useShelfFocus } from './useShelfFocus';

export interface DramaShelfItem {
    id: string;
    name: string;
    /** 劇集原圖（16:9，已經有劇名） */
    art: string;
    /** 角落細字（例如「10 個短篇」/「每日更新」）：平時右下，有「繼續收聽」就讓去右上 */
    meta: string;
    /** 有新嘢先有：左上角出「新」，讀屏講呢句（例如「有新短篇」/「今日有新一集」） */
    newLabel?: string;
    /** 聽過先有：繼續收聽邊集（「短篇 · 第 N 集 集名」）同嗰集聽到幾多（0–1） */
    resume?: { label: string; ratio: number };
    onOpen: () => void;
}

const CONTINUE_ICON_SIZE = 16;

interface DramaShelfProps {
    items: readonly DramaShelfItem[];
    /** 手機打橫先畀：橫額入格，同劇集一齊排（HomeLandscapeGrid）；收劇集數揀點畫 */
    renderBanner?: (count: number) => ReactNode;
}

/** 讀屏名：劇名（+ 繼續收聽邊集）（+ 有新嘢） */
const tileLabel = ({ name, newLabel, resume }: DramaShelfItem): string => {
    const base = resume ? t('drama.tileContinue', { name, label: resume.label }) : name;
    return newLabel ? t('drama.tileNew', { name: base, label: newLabel }) : base;
};

/** 圖底「繼續收聽」條：短篇 · 集數、進度線、▶（成格都係掣，呢度只係顯示） */
const ContinueStrip = ({ label, ratio }: NonNullable<DramaShelfItem['resume']>) => (
    <span className={styles.continue} aria-hidden="true">
        <span className={styles.continueTitle}>{t('drama.continue')}</span>
        <Marquee className={styles.continueLabel} text={label} />
        <span className={styles.continueBar}>
            <span data-continue-fill="" style={{ width: `${toPercent(ratio)}%` }} />
        </span>
        <span className={styles.continuePlay}>
            <PlayIcon size={CONTINUE_ICON_SIZE} />
        </span>
    </span>
);

/** 疊卡 focus 用嘅掣屬性（useShelfFocus 嘅 tileProps）；冇就撳落即 open */
type TileFocusProps = Partial<ReturnType<ReturnType<typeof useShelfFocus>['tileProps']>>;

interface DramaTileProps {
    item: DramaShelfItem;
    focusProps?: TileFocusProps;
}

/** 劇集格：圖上冇字（劇名喺圖入面，靠 aria-label）；同節目格一樣有「New」；聽過就喺圖底出「繼續收聽」 */
const DramaTile = ({ item, focusProps }: DramaTileProps) => (
    <button
        type="button"
        className={styles.tile}
        aria-label={tileLabel(item)}
        onClick={item.onOpen}
        {...focusProps}
    >
        <img className={styles.art} src={item.art} alt="" />
        {item.newLabel && <NewBadge className={styles.newBadge} />}
        <span
            className={`${styles.meta} ${item.resume ? styles.metaTop : ''}`}
            data-corner={item.resume ? 'top' : 'bottom'}
            aria-hidden="true"
        >
            {item.meta}
        </span>
        {item.resume && <ContinueStrip {...item.resume} />}
    </button>
);

/**
 * 直版：一行一套，卡疊住（每行矮過張卡，蓋住下一張），疊到最後一張到底（T8，useShelfFocus 計）；
 * focus 卡全大、全亮，其他縮細、蓋暗。放唔晒先上下捲，每張卡 snap，停喺 snap 位嗰張係 focus。
 * 闊橫版（iPad / 桌面）兩套並排，唔疊、唔 focus
 */
const ShelfColumn = ({ items }: { items: readonly DramaShelfItem[] }) => {
    const stacked = !useMediaQuery(LANDSCAPE_QUERY);
    const { shelfRef, style, scrolls, onScroll, tileProps } = useShelfFocus(items.length, stacked);
    return (
        <nav
            ref={shelfRef}
            className={styles.shelf}
            aria-label={t('home.dramasNav')}
            data-stacked={stacked ? '' : undefined}
            data-scroll={scrolls ? '' : undefined}
            style={style}
            onScroll={stacked ? onScroll : undefined}
        >
            {items.map((item, i) => (
                <DramaTile
                    key={item.id}
                    item={item}
                    focusProps={stacked ? tileProps(i, item.onOpen) : undefined}
                />
            ))}
        </nav>
    );
};

/**
 * 主頁「廣播劇」tab：填滿橫額同 mini player 之間嘅高度，劇集多到放唔落就自己捲（唯一捲動嘅 panel）。
 * 手機打橫（有 renderBanner）用同節目共用嘅 HomeLandscapeGrid，幾多套都放得晒
 */
export const DramaShelf = ({ items, renderBanner }: DramaShelfProps) => {
    if (!renderBanner) return <ShelfColumn items={items} />;
    return (
        <HomeLandscapeGrid
            label={t('home.dramasNav')}
            tiles={items.map((item) => (
                <DramaTile key={item.id} item={item} />
            ))}
            renderBanner={renderBanner}
        />
    );
};
