import { useRef } from 'react';
import { useElementSize } from '../../../../hooks/useElementSize';
import { t } from '../../../../i18n/t';
import { RecentPanel } from './RecentPanel';
import { SavedBox } from './SavedBox';
import styles from './SavedTab.module.css';
import type { SavedTabView } from './savedTypes';

/**
 * 主頁「我的收藏」tab（P7 #7，_mockups_/bookmark L3 + B1 + 碟）：
 * 收藏 box 區自己捲（CSS 分欄，欄數見 savedGrid），最近收聽固定喺底（直版 / 闊橫版）或者右（窄橫版）。
 * 得一個收藏：box 用盡闊度，banner 喺上面按位放大（SavedBox soloHeight）
 */
export const SavedTab = ({ view }: { view: SavedTabView }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const area = useElementSize(scrollRef);
    return (
        <section
            className={styles.saved}
            data-layout={view.layout}
            data-solo={String(view.solo)}
            aria-label={t('home.tabSaved')}
        >
            <div ref={scrollRef} className={styles.scroll}>
                <ul className={styles.cols} style={{ columnCount: view.columns }}>
                    {view.boxes.map((box) => (
                        <li key={box.key} className={styles.boxItem}>
                            <SavedBox box={box} soloHeight={view.solo ? area.height : undefined} />
                        </li>
                    ))}
                </ul>
            </div>
            {view.recent.length > 0 && <RecentPanel rows={view.recent} />}
        </section>
    );
};
