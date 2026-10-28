import type { ReactNode } from 'react';
import { LANDSCAPE_QUERY } from '../../config/layout';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { HomeLandscapeGrid } from '../HomeLandscapeGrid/HomeLandscapeGrid';
import { t } from '../../i18n/t';
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
 * 闊橫版（iPad / 桌面）兩套並排，唔疊、唔 focus
 */
const ShelfColumn = ({ items }: { items: readonly DramaShelfItem[] }) => {
    const stacked = !useMediaQuery(LANDSCAPE_QUERY);
    const focus = useShelfFocus(items.length, stacked);
    const { shelfRef, style, scrolls, onScroll, tileProps, scrubProps } = focus;
    const focusedIndex = focus.focus;
    return (
        <nav
            ref={shelfRef}
            className={styles.shelf}
            aria-label={t('home.dramasNav')}
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
