import type { KeyboardEvent, ReactNode } from 'react';
import { stepIndex, useSwipe } from '../../hooks/useSwipe';
import { t } from '../../i18n/t';
import styles from './ShowCarousel.module.css';

interface ShowCarouselProps {
    /** 每個節目嘅節目圖（按次序） */
    arts: string[];
    index: number;
    onChange: (index: number) => void;
    children: ReactNode;
}

const KEY_DIRECTION = { ArrowRight: 'next', ArrowLeft: 'previous' } as const;

/** 今日節目輪播：左右掃或者方向鍵轉節目，兩邊露出鄰近節目 */
export const ShowCarousel = ({ arts, index, onChange, children }: ShowCarouselProps) => {
    const go = (direction: 'next' | 'previous') => {
        const next = stepIndex(index, arts.length, direction);
        if (next !== index) onChange(next);
    };
    const swipe = useSwipe(go);
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const direction = KEY_DIRECTION[event.key as keyof typeof KEY_DIRECTION];
        if (direction) go(direction);
    };
    const previous = arts[index - 1];
    const next = arts[index + 1];

    return (
        <div
            className={styles.carousel}
            role="group"
            aria-roledescription={t('carousel.roleDescription')}
            aria-label={t('carousel.label')}
            onKeyDown={onKeyDown}
            {...swipe}
        >
            {previous && (
                <span className={`${styles.peek} ${styles.previous}`} aria-hidden="true">
                    <img className={styles.art} src={previous} alt="" />
                </span>
            )}
            {next && (
                <span className={`${styles.peek} ${styles.next}`} aria-hidden="true">
                    <img className={styles.art} src={next} alt="" />
                </span>
            )}
            {children}
        </div>
    );
};
