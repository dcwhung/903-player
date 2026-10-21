import { useSyncExternalStore } from 'react';

/** 冇 matchMedia（jsdom / SSR）當唔符合 */
const mediaList = (query: string): MediaQueryList | undefined =>
    typeof window.matchMedia === 'function' ? window.matchMedia(query) : undefined;

/** 而家符唔符合 media query；轉向 / 改視窗大小會跟住 re-render */
export const useMediaQuery = (query: string): boolean =>
    useSyncExternalStore(
        (onChange) => {
            const list = mediaList(query);
            // 舊 Safari（< 14）嘅 MediaQueryList 冇 addEventListener：唔跟轉向，用返第一次嘅結果
            list?.addEventListener?.('change', onChange);
            return () => list?.removeEventListener?.('change', onChange);
        },
        () => mediaList(query)?.matches ?? false,
        () => false,
    );
