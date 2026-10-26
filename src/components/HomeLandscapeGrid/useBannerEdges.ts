import { useEffect, useState, type RefObject } from 'react';
import { loadBannerEdges, type BannerEdges } from './bannerEdges';

/** 橫額圖四邊嘅邊色；未讀到（載入中、jsdom）就 null，邊位暫時用格底色 */
export const useBannerEdges = (src: string): BannerEdges | null => {
    const [edges, setEdges] = useState<{ src: string; edges: BannerEdges | null }>();
    useEffect(() => {
        let alive = true;
        void loadBannerEdges(src).then((next) => {
            if (alive) setEdges({ src, edges: next });
        });
        return () => {
            alive = false;
        };
    }, [src]);
    // 換咗圖（例如開咗 mini player）就唔好用住舊圖嘅邊色
    return edges?.src === src ? edges.edges : null;
};

/** 元素闊 ÷ 高，跟住改大細（ResizeObserver）；未量到 / 冇 ResizeObserver（jsdom）就 NaN */
export const useAspectRatio = (ref: RefObject<HTMLElement | null>): number => {
    const [ratio, setRatio] = useState(Number.NaN);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            setRatio(el.clientHeight > 0 ? el.clientWidth / el.clientHeight : Number.NaN);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref]);
    return ratio;
};
