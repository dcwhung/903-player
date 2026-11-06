import { useRef, type AnimationEvent } from 'react';
import { useElementSize } from '../../../../hooks/useElementSize';
import { t } from '../../../../i18n/t';
import type { ThirdTab } from '../../../../selectors/bookmarks';
import { useLeaveFallback } from '../../../shared/player/PlayerHandle/useLeaveFallback';
import { RecentPanel } from './RecentPanel';
import { RemoveHintProvider } from './removeHint';
import { SavedBox } from './SavedBox';
import styles from './SavedTab.module.css';
import type { SavedTabView } from './savedTypes';
import { useModeSwap } from './useModeSwap';

/** 舊內容淡出嘅時長 token（SavedTab.module.css .saved[data-leaving] 用同一個） */
const PANE_FADE_VAR = '--view-transition-fade';

/**
 * 有收藏版（_mockups_/bookmark L3 + B1 + 碟）：
 * 收藏 box 區自己捲（CSS 分欄，欄數見 savedGrid），最近收聽固定喺底（直版 / 闊橫版）或者右（窄橫版）。
 * 得一個收藏：box 用盡闊度，banner 喺上面按位放大（SavedBox soloHeight）
 */
const SavedPane = ({ view }: { view: SavedTabView }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const area = useElementSize(scrollRef);
    return (
        <>
            <div ref={scrollRef} className={styles.scroll}>
                <RemoveHintProvider>
                    <ul className={styles.cols} style={{ columnCount: view.columns }}>
                        {view.boxes.map((box) => (
                            <li key={box.key} className={styles.boxItem}>
                                <SavedBox
                                    box={box}
                                    soloHeight={view.solo ? area.height : undefined}
                                />
                            </li>
                        ))}
                    </ul>
                </RemoveHintProvider>
            </div>
            {view.recent.length > 0 && <RecentPanel rows={view.recent} />}
        </>
    );
};

interface PaneProps {
    view: SavedTabView;
    mode: ThirdTab;
    entering?: boolean;
    /** 淡出緊：淡完（animationend；cancel 咗或者冇動畫就靠 useLeaveFallback）叫 onLeft 先拆走 */
    onLeft?: (() => void) | undefined;
}

/**
 * 一款內容（mode）：saved = 收藏 box + 最近收聽；recent = 成個 tab 係最近收聽（_mockups_/qr-transfer ②）。
 * 淡出緊嗰款疊喺新嗰款上面，唔撳得、讀屏唔讀
 */
const Pane = ({ view, mode, entering = false, onLeft }: PaneProps) => {
    const ref = useRef<HTMLElement>(null);
    const leaving = onLeft !== undefined;
    useLeaveFallback(ref, leaving, onLeft, PANE_FADE_VAR);
    // 只認自己嘅淡出動畫，入面元素嘅動畫唔算
    const onAnimationEnd = (event: AnimationEvent) => {
        if (leaving && event.target === event.currentTarget) onLeft();
    };
    const recentOnly = mode === 'recent';
    return (
        <section
            ref={ref}
            className={styles.saved}
            data-saved-mode={mode}
            data-layout={view.layout}
            data-solo={String(!recentOnly && view.solo)}
            data-leaving={leaving ? '' : undefined}
            data-entering={entering ? '' : undefined}
            inert={leaving}
            aria-hidden={leaving || undefined}
            // 冇收藏版：入面嘅最近收聽 region 自己有名，外層唔再包一個同名 region
            aria-label={recentOnly ? undefined : t('home.tabSaved')}
            onAnimationEnd={onAnimationEnd}
        >
            {recentOnly ? (
                <RecentPanel rows={view.recent} fill columns={view.recentColumns} />
            ) : (
                <SavedPane view={view} />
            )}
        </section>
    );
};

/**
 * 主頁第三個 tab 嘅內容：有收藏版 / 冇收藏版（mode）。兩款互換時舊嘅淡出、新嘅等佢淡完先淡入
 * （_mockups_/qr-transfer ① .fade-layer）；減少動態直接換（useModeSwap）
 */
export const SavedTab = ({ view }: { view: SavedTabView }) => {
    const { leaving, entering, onLeft } = useModeSwap(view.mode);
    return (
        <div className={styles.swap}>
            {/* 新嗰款排前：data-zoom-key 搵行 zoom 入頁時先搵到佢，唔會搵到淡出緊嗰款 */}
            <Pane key={view.mode} view={view} mode={view.mode} entering={entering} />
            {leaving !== null && <Pane key={leaving} view={view} mode={leaving} onLeft={onLeft} />}
        </div>
    );
};
