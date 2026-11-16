import { useRef, type CSSProperties } from 'react';
import { CATALOG_IMAGE_CROSS_ORIGIN } from '../../../../config/catalogImage';
import { t } from '../../../../i18n/t';
import { bannerRule } from './bannerRules';
import type { BannerEdges } from './bannerEdges';
import { useAspectRatio, useBannerEdges } from './useBannerEdges';
import { useBannerImages } from './useBannerImages';
import styles from './FittedBanner.module.css';

interface FittedBannerProps {
    /** 主頁幾多張卡（唔計橫額） */
    count: number;
    /** 有冇 mini player（影響用邊張圖、點放大） */
    miniPlayer: boolean;
}

const EDGE_SIDES = ['left', 'right', 'top', 'bottom'] as const;

/** 圖四邊外面嘅補色帶（純裝飾）；未讀到邊色就唔畫 */
const EdgeFill = ({ edges }: { edges: BannerEdges | null }) =>
    edges &&
    EDGE_SIDES.map((side) => (
        <span
            key={side}
            className={styles.edge}
            data-side={side}
            style={{ background: edges[side] }}
            aria-hidden="true"
        />
    ));

/**
 * 手機打橫主頁嘅橫額格：按卡數同 mini player（bannerRule）揀圖、放大方式同移位，
 * 圖放唔滿個格嘅位用圖邊顏色補（左右沿高漸變、上面沿闊漸變、下面一隻色），唔會見到空位。
 * catalog 圖載入失敗換返內建圖（S-929），邊色跟住新圖重新讀。
 * 位置同大細全部 CSS 計（container 單位），轉向 / 改大細唔使 JS 重畫
 */
export const FittedBanner = ({ count, miniPlayer }: FittedBannerProps) => {
    const ref = useRef<HTMLSpanElement>(null);
    const rule = bannerRule(count, miniPlayer, useAspectRatio(ref));
    const { images, onError } = useBannerImages();
    const image = images[rule.image];
    const edges = useBannerEdges(image.src);
    const vars = {
        '--banner-ratio': image.width / image.height,
        '--banner-shift-x': `${rule.shiftRightPx}px`,
        '--banner-shift-y': `${rule.shiftDownPx}px`,
    } as CSSProperties;
    return (
        <span ref={ref} className={styles.fit} data-fit={rule.fit} style={vars}>
            <span className={styles.frame}>
                <EdgeFill edges={edges} />
                <img
                    className={styles.image}
                    src={image.src}
                    alt={t('home.bannerAlt')}
                    crossOrigin={CATALOG_IMAGE_CROSS_ORIGIN}
                    onError={onError}
                />
            </span>
        </span>
    );
};
