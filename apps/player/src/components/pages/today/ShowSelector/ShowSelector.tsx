import { useEffect, useRef } from 'react';
import { t } from '../../../../i18n/t';
import { scrollBehavior } from '../../../../utils/motion';
import { Disc } from '../../../shared/common/Disc/Disc';
import styles from './ShowSelector.module.css';
import { useEdgeFade } from './useEdgeFade';

export interface ShowSelectorItem {
    key: string;
    name: string;
    /** 碟面（節目圖） */
    art: string;
    /** 未上架：灰色、撳唔到 */
    available: boolean;
}

interface ShowSelectorProps {
    /** 今日節目（播出次序，包括未上架） */
    items: readonly ShowSelectorItem[];
    /** 揀中（播緊 / 睇緊）嗰個；冇就冇格有外框 */
    selectedKey: string | undefined;
    onSelect: (key: string) => void;
}

/** 兩邊淡出位（CSS padding-inline = --show-selector-fade）：捲入畫面要連埋呢段，格唔會停喺淡出位入面 */
const fadeInset = (list: HTMLElement): number =>
    Number.parseFloat(getComputedStyle(list).paddingLeft) || 0;

/**
 * 揀中嗰格捲入可見範圍（左右邊都唔切走、唔停喺淡出位）；已經睇到就唔郁。
 * 用 scrollTo 而唔係 scrollIntoView：唔會帶動外面嘅固定版面
 */
const revealCell = (list: HTMLElement, cell: HTMLElement, behavior: ScrollBehavior) => {
    const inset = fadeInset(list);
    const start = cell.offsetLeft - inset;
    const end = cell.offsetLeft + cell.offsetWidth + inset;
    const { scrollLeft, clientWidth } = list;
    if (start < scrollLeft) {
        list.scrollTo({ left: start, behavior });
    } else if (end > scrollLeft + clientWidth) {
        list.scrollTo({ left: end - clientWidth, behavior });
    }
};

/** 轉節目時揀中嗰格捲入畫面；第一次 render 直接跳（唔播動畫），之後跟減少動態設定 */
const useRevealSelected = (selectedIndex: number) => {
    const listRef = useRef<HTMLUListElement>(null);
    const mountedRef = useRef(false);
    useEffect(() => {
        const list = listRef.current;
        const cell = list?.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
        if (list && cell) {
            // 動畫開始嗰刻先問減少動態（唔 cache，CLAUDE.md Motion）
            revealCell(list, cell, mountedRef.current ? scrollBehavior() : 'auto');
        }
        mountedRef.current = true;
    }, [selectedIndex]);
    return listRef;
};

const Cell = ({
    item,
    selected,
    onSelect,
}: {
    item: ShowSelectorItem;
    selected: boolean;
    onSelect: (key: string) => void;
}) => (
    <button
        type="button"
        className={styles.cell}
        aria-current={selected ? 'true' : undefined}
        // 未上架：讀屏讀埋「未上架」（畫面靠灰色），停用即撳唔到
        aria-label={
            item.available
                ? undefined
                : t('today.selectorUnavailable', {
                      name: item.name,
                      status: t('today.statusUnavailable'),
                  })
        }
        disabled={!item.available}
        onClick={() => onSelect(item.key)}
    >
        <Disc size="small" art={item.art} />
        <span className={styles.name}>{item.name}</span>
    </button>
);

/**
 * HomeView 今日節目頁「現正播放」下面嘅節目 selector（P10 lane 7a，_mockups_/home-view .sel）：
 * 每格碟面 + 節目名，撳就轉去嗰個節目；揀中嗰格有外框（aria-current），未上架嘅灰色停用；
 * 一次見到 4 格，多過 4 個就左右捲，揀中嗰格自動捲入畫面；仲有格嗰邊淡出（useEdgeFade）
 */
export const ShowSelector = ({ items, selectedKey, onSelect }: ShowSelectorProps) => {
    const selectedIndex = items.findIndex((item) => item.key === selectedKey);
    const listRef = useRevealSelected(selectedIndex);
    const fade = useEdgeFade(listRef, items.length);
    return (
        <ul
            ref={listRef}
            className={styles.selector}
            aria-label={t('today.selectorLabel')}
            data-show-selector=""
            data-fade-start={fade.start}
            data-fade-end={fade.end}
        >
            {items.map((item, index) => (
                <li key={item.key} className={styles.item} data-index={index}>
                    <Cell item={item} selected={index === selectedIndex} onSelect={onSelect} />
                </li>
            ))}
        </ul>
    );
};
