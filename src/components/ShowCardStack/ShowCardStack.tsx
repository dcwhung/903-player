import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { arrowKeyDirection, type SwipeDirection, wrapIndex } from '../../hooks/swipe';
import { t } from '../../i18n/t';
import { stackSlots } from './cardStack';
import { GhostCard, type GhostSlot, type StackCard } from './GhostCard';
import styles from './ShowCardStack.module.css';
import { useCardDrag } from './useCardDrag';
import { useCardMotion } from './useCardMotion';

export type { StackCard } from './GhostCard';

interface ShowCardStackProps {
    cards: StackCard[];
    index: number;
    onChange: (index: number) => void;
    /** 最上面嗰張卡嘅內容（播放器） */
    children: ReactNode;
}

/** 方向鍵只係焦點喺卡疊本身先轉節目；卡入面嘅掣 / 進度 slider 有自己用途 */
const ownsArrowKeys = (event: KeyboardEvent<HTMLDivElement>): boolean =>
    event.target === event.currentTarget;

/** 拖動 / 方向鍵都係飛走之後先轉去目標節目（循環）；得一個節目就唔轉 */
const useShowCardStack = (index: number, total: number, onChange: (index: number) => void) => {
    const motion = useCardMotion();
    // 落地時讀最新 index：飛緊期間已經轉咗（例如撳下面清單）就唔好蓋過
    const latestIndex = useRef(index);
    useEffect(() => {
        latestIndex.current = index;
    }, [index]);
    const go = (direction: SwipeDirection) => {
        if (motion.isFlying()) return;
        const target = wrapIndex(index, total, direction);
        motion.fly(direction, () => {
            if (latestIndex.current === index) onChange(target);
        });
    };
    const handlers = useCardDrag(motion, total > 1 ? go : null);
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const direction = arrowKeyDirection(event.key);
        if (direction && total > 1 && ownsArrowKeys(event)) go(direction);
    };
    return { stackRef: motion.stackRef, topRef: motion.topRef, handlers, onKeyDown };
};

/** 今日節目卡疊（Tinder 式）：拖動傾斜，放手飛走；向左 = 下一個，向右 = 上一個，循環 */
export const ShowCardStack = ({ cards, index, onChange, children }: ShowCardStackProps) => {
    const { stackRef, topRef, handlers, onKeyDown } = useShowCardStack(
        index,
        cards.length,
        onChange,
    );
    const { behind, incoming } = stackSlots(index, cards.length);
    const ghost = (i: number | null, slot: GhostSlot) => {
        const card = i === null ? undefined : cards[i];
        return card && <GhostCard key={slot} card={card} slot={slot} />;
    };

    return (
        <div
            ref={stackRef}
            className={styles.stack}
            role="group"
            aria-roledescription={t('cardStack.roleDescription')}
            aria-label={t('cardStack.label')}
            tabIndex={0}
            onKeyDown={onKeyDown}
            {...handlers}
        >
            {ghost(behind[1] ?? null, 'depth2')}
            {ghost(behind[0] ?? null, 'depth1')}
            <div ref={topRef} className={`${styles.card} ${styles.top}`}>
                {children}
            </div>
            {ghost(incoming, 'incoming')}
        </div>
    );
};
