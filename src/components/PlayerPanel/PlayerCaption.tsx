import type { ReactNode, RefObject } from 'react';
import type { SwipeDirection } from '../../hooks/swipe';
import { DateStrip } from '../DateStrip/DateStrip';
import type { StripNeighbours } from '../DateStrip/dateStrip';
import { PlayerTitles } from './PlayerTitles';

interface PlayerCaptionProps {
    title: string;
    dateLabel: string;
    accessory?: ReactNode;
    onStep?: (direction: SwipeDirection) => boolean;
    neighbours?: StripNeighbours;
    spinRef: RefObject<HTMLElement | null>;
}

const NO_NEIGHBOURS: StripNeighbours = {};

/**
 * 唱片下面嗰行：節目頁（轉得集）用日子條，節目名已經喺頁頭；
 * 今日節目頁（唔傳 onStep）照舊顯示日期 + 節目名。
 */
export const PlayerCaption = (props: PlayerCaptionProps) => {
    const { title, dateLabel, accessory, onStep, neighbours = NO_NEIGHBOURS, spinRef } = props;
    if (!onStep) return <PlayerTitles title={title} dateLabel={dateLabel} accessory={accessory} />;
    return (
        <>
            <DateStrip
                title={title}
                dateLabel={dateLabel}
                neighbours={neighbours}
                onStep={onStep}
                spinRef={spinRef}
            />
            {accessory}
        </>
    );
};
