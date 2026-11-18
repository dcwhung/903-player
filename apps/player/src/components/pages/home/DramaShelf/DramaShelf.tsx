import type { ReactNode } from 'react';
import { DUO_OPEN_PORTRAIT_QUERY, LANDSCAPE_LAYOUT_QUERY } from '../../../../config/layout';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { HomeLandscapeGrid } from '../HomeLandscapeGrid/HomeLandscapeGrid';
import { t } from '../../../../i18n/t';
import styles from './DramaShelf.module.css';
import { DramaTile, tileFocus, type DramaShelfItem } from './DramaTile';
import { useShelfFocus } from './useShelfFocus';

export type { DramaShelfItem } from './DramaTile';

interface DramaShelfProps {
    items: readonly DramaShelfItem[];
    /** 手機打橫先畀：橫額入格，同劇集一齊排（HomeLandscapeGrid）；收劇集數揀點畫 */
    renderBanner?: (count: number) => ReactNode;
}

/**
 * 直版：一行一套，卡疊住（每行矮過張卡，蓋住下一張），疊到最後一張到底（T8，useShelfFocus 計）；
 * focus 卡全大、全亮，其他縮細、蓋暗。放唔晒先上下捲，每張卡 snap，停喺 snap 位嗰張係 focus；
 * 放得晒就手指上下捽揀 focus（scrubProps，要捲 / 橫版時乜都唔做）。
 * 闊橫版（iPad / 桌面）兩套並排，唔疊、唔 focus。
 * 新主頁（P10，HomeWide shelf）兩個 tab 都用呢個：有播放卡就疊，冇就兩欄
 */
interface ShelfColumnProps {
    items: readonly DramaShelfItem[];
    /** 疊唔疊：冇就按畫面（直版疊、橫版兩欄）；新主頁（HomeWide shelf）自己定 */
    stacked?: boolean;
    /** 書架讀屏名：冇就係「廣播劇」；新主頁「節目」tab 用「節目」 */
    label?: string;
    /** 載入緊（aria-busy，同節目格一樣）；冇就唔出 */
    busy?: boolean;
}

export const ShelfColumn = ({ items, stacked: forced, label, busy }: ShelfColumnProps) => {
    const landscape = useMediaQuery(LANDSCAPE_LAYOUT_QUERY);
    // Duo 打開・直（P10 lane 5a）畫面闊：兩欄 grid，唔疊（用戶 2026-11-18：兩欄以上用 grid）
    const wide = useMediaQuery(DUO_OPEN_PORTRAIT_QUERY);
    const stacked = forced ?? !(landscape || wide);
    const focus = useShelfFocus(items.length, stacked);
    const { shelfRef, style, scrolls, onScroll, tileProps, scrubProps } = focus;
    const focusedIndex = focus.focus;
    return (
        <nav
            ref={shelfRef}
            className={styles.shelf}
            aria-label={label ?? t('home.dramasNav')}
            aria-busy={busy}
            data-stacked={stacked ? '' : undefined}
            data-scroll={scrolls ? '' : undefined}
            style={style}
            onScroll={stacked ? onScroll : undefined}
            {...scrubProps}
        >
            {items.map((item, i) => (
                <DramaTile
                    key={item.id}
                    item={item}
                    focus={stacked ? tileFocus(tileProps, i === focusedIndex, i, item) : undefined}
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
