import { useRef, useState } from 'react';
import { scrollBehavior } from '../../utils/motion';

/**
 * 分頁節目格嘅左右掃（scroll-snap）：scroller 捲到邊頁就係第幾頁，撳指示點就捲過去。
 * scrollerRef 只喺 event 時讀（符合 react-hooks/refs）
 */
export const useGridPager = (pageCount: number) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);

    const onScroll = () => {
        const scroller = scrollerRef.current;
        if (!scroller || scroller.clientWidth === 0) return;
        setIndex(Math.round(scroller.scrollLeft / scroller.clientWidth));
    };
    const goTo = (page: number) => {
        const scroller = scrollerRef.current;
        scroller?.scrollTo({ left: page * scroller.clientWidth, behavior: scrollBehavior() });
        setIndex(page);
    };

    // 轉向 / 放大令頁數變少：瀏覽器會將 scrollLeft 收返入範圍（再觸發 onScroll），之前先當最後一頁
    return { scrollerRef, index: Math.min(index, pageCount - 1), onScroll, goTo };
};
