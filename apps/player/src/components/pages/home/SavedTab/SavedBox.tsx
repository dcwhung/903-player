import { useRef, type CSSProperties } from 'react';
import { useElementSize } from '../../../../hooks/useElementSize';
import { Disc } from '../../../shared/common/Disc/Disc';
import { SavedRow } from './SavedRow';
import styles from './SavedTab.module.css';
import type { SavedBoxView, SavedSectionView } from './savedTypes';

/** box 入面一段：左邊碟，右邊（短篇名 +）各集 */
const SavedSection = ({ section }: { section: SavedSectionView }) => (
    <section className={styles.section} data-saved-section="">
        <span className={styles.disc}>
            <Disc size="small" art={section.art} />
        </span>
        <div className={styles.sectionBody}>
            {section.heading && <h3 className={styles.arc}>{section.heading}</h3>}
            <ul className={styles.rows}>
                {section.rows.map((row) => (
                    <SavedRow key={row.key} row={row} />
                ))}
            </ul>
        </div>
    </section>
);

interface SavedBoxProps {
    box: SavedBoxView;
    /**
     * 得一個收藏（solo）：收藏區嘅高。banner 最高 = 原圖比例全幅，位唔夠就壓矮到
     * 收藏區高減集數高（目標係唔使捲），最矮 = 普通 banner 高（CSS 見 .saved[data-solo] .banner）
     */
    soloHeight?: number | undefined;
}

/** 一個節目 / 一套劇：頂 B1 banner（大類橫圖、名疊左下、左邊暗漸變），下面每段 */
export const SavedBox = ({ box, soloHeight }: SavedBoxProps) => {
    const sectionsRef = useRef<HTMLDivElement>(null);
    const sections = useElementSize(sectionsRef);
    const room = soloHeight === undefined ? undefined : Math.max(0, soloHeight - sections.height);
    const style = room === undefined ? undefined : { '--saved-solo-room': `${room}px` };
    return (
        <article
            className={styles.box}
            data-kind={box.kind}
            data-removed={box.removed ? '' : undefined}
            data-saved-box=""
            style={style as CSSProperties | undefined}
        >
            <div className={styles.banner}>
                <img className={styles.bannerArt} src={box.banner} alt="" />
                <h2 className={styles.bannerTitle}>{box.title}</h2>
            </div>
            <div ref={sectionsRef}>
                {box.sections.map((section) => (
                    <SavedSection key={section.key} section={section} />
                ))}
            </div>
        </article>
    );
};
