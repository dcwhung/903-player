import { useEffect, useRef, type RefObject } from 'react';
import { scrollRowIntoPanel, scrollRowToTop } from '../../../../utils/scroll';
import type { EpisodeItem, EpisodeScrollAlign } from './episodeListTypes';

/** 由「我的收藏」入嚟嗰集短暫 highlight 幾耐（之後淡返；減少動態就即刻冇） */
export const FOCUS_FLASH_MS = 1600;

/** highlight 用 DOM attribute（唔經 React state）：淨係樣式，唔使為咗佢 re-render 成張清單 */
const FOCUSED_ATTR = 'data-focused';

const findRow = (list: HTMLElement, key: string): HTMLElement | undefined =>
    [...list.querySelectorAll<HTMLElement>('li[data-episode-key]')].find(
        (li) => li.getAttribute('data-episode-key') === key,
    );

/** 入頁即刻跳過去（唔順滑捲）；短篇清單同揀中集一樣捲到頂、露半行上一集 */
const jumpTo = (list: HTMLElement, row: HTMLElement, align: EpisodeScrollAlign) =>
    align === 'top' ? scrollRowToTop(list, row, 'auto') : scrollRowIntoPanel(list, row, 'auto');

/**
 * 由收藏 tab 撳一行入頁（focusKey = 嗰集網址）：清單出到嗰集（錄音可能仲載緊）就捲過去、
 * 短暫 highlight；每個 focusKey 只做一次。喺 useScrollToCurrent 之後行，蓋過捲去揀中集
 */
export const useFocusRow = (
    listRef: RefObject<HTMLUListElement | null>,
    items: readonly EpisodeItem[],
    focusKey: string | undefined,
    align: EpisodeScrollAlign,
) => {
    const listed = focusKey !== undefined && items.some((item) => item.key === focusKey);
    const done = useRef<string | undefined>(undefined);
    useEffect(() => {
        const list = listRef.current;
        if (!listed || !list || focusKey === undefined || done.current === focusKey) return;
        const row = findRow(list, focusKey);
        if (!row) return;
        done.current = focusKey;
        jumpTo(list, row, align);
        row.setAttribute(FOCUSED_ATTR, '');
        const timer = setTimeout(() => row.removeAttribute(FOCUSED_ATTR), FOCUS_FLASH_MS);
        return () => clearTimeout(timer);
    }, [listRef, listed, focusKey, align]);
};
