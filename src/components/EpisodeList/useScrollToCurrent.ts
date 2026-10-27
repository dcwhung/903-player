import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { scrollBehavior } from '../../utils/motion';
import { scrollRowIntoPanel, scrollRowToTop } from '../../utils/scroll';
import type { EpisodeItem, EpisodeScrollAlign } from './episodeListTypes';

/** 打橫 / 打直：短篇清單轉畫面後要重新捲到播緊嗰集 */
const ORIENTATION_QUERY = '(orientation: landscape)';

/** top：捲到播緊嗰集（頂、露半行上一集）；新清單冇播緊嗰集就由頂開始 */
const scrollToTop = (list: HTMLUListElement, fresh: boolean) => {
    const row = list.querySelector('[aria-current="true"]');
    const behavior = fresh ? 'auto' : scrollBehavior();
    if (row) scrollRowToTop(list, row.closest('li') ?? row, behavior);
    else if (fresh) list.scrollTo?.({ top: 0, behavior });
};

/** 上次捲嗰陣嘅清單 / 方向；返回呢次係咪新清單、有冇轉過畫面 */
const useScrollMemo = (listKey: string | undefined, landscape: boolean | undefined) => {
    const shown = useRef({ listKey: undefined as string | undefined, landscape });
    // 只喺清單 / 方向變咗先換：effect 依賴佢，節目頁（兩樣都係 undefined）唔會每次 render 都捲
    return useCallback(() => {
        const fresh = shown.current.listKey !== listKey;
        const rotated = shown.current.landscape !== landscape;
        shown.current = { listKey, landscape };
        return { fresh: fresh || rotated, rotated };
    }, [listKey, landscape]);
};

/**
 * 入頁 / 轉集時只喺 panel 入面捲到揀中嗰集。
 * top：成張清單換咗（入頁、轉短篇）或者轉咗畫面即刻跳過去（轉畫面等下一個 frame，新 layout 排好先捲）；
 * 同一張清單轉集（自動播下一集）就順滑捲
 */
export const useScrollToCurrent = (
    listRef: RefObject<HTMLUListElement | null>,
    items: EpisodeItem[],
    align: EpisodeScrollAlign,
) => {
    const currentKey = items.find((item) => item.current)?.key;
    // 清單身份（轉咗短篇）同方向只係 top 模式用：節目頁新錄音加喺頂 / 轉畫面都唔應該令清單捲返去
    const isTop = align === 'top';
    const listKey = isTop ? items[0]?.key : undefined;
    const landscape = useMediaQuery(ORIENTATION_QUERY);
    const orientation = isTop ? landscape : undefined;
    const remember = useScrollMemo(listKey, orientation);
    useEffect(() => {
        const list = listRef.current;
        const { fresh, rotated } = remember();
        if (!list) return undefined;
        if (!isTop) {
            const row = list.querySelector('[aria-current="true"]');
            if (row) scrollRowIntoPanel(list, row, scrollBehavior());
            return undefined;
        }
        if (!rotated) return scrollToTop(list, fresh);
        const frame = requestAnimationFrame(() => scrollToTop(list, fresh));
        return () => cancelAnimationFrame(frame);
    }, [listRef, currentKey, listKey, orientation, isTop, remember]);
};
