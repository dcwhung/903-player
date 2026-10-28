import type { ReactNode } from 'react';
import { NowPlaying } from '../components/NowPlaying/NowPlaying';
import { PlayerCard } from '../components/PlayerPanel/PlayerCard';
import { ShowCardStack, type StackCard } from '../components/ShowCardStack/ShowCardStack';
import { TodayEmpty } from '../components/TodayEmpty/TodayEmpty';
import { t } from '../i18n/t';
import { usePlayer } from '../player/usePlayer';
import { formatDateLabel } from '../utils/date';
import { hasKnownDuration } from '../utils/time';
import { LoadState } from './LoadState';
import page from './Page.module.css';
import type { useTodayPage } from './useTodayPage';

interface TodayStackProps {
    cards: StackCard[];
    index: number;
    title: string;
    art: string | undefined;
    /** 播緊其他嘢先有：卡疊最上面嗰張係未開始樣，撳播放先播佢 */
    onStart: (() => void) | undefined;
    onChange: (index: number) => void;
    /** 卡疊下面嘅指示點；手機打橫搬咗上頁頭就冇 */
    dots: ReactNode;
}

/** 今日節目卡疊（最上面係播放器）+ 卡外嘅指示點，一組唔縮 */
const TodayStack = ({ cards, index, title, art, onStart, onChange, dots }: TodayStackProps) => (
    <div className={page.todayPlayer}>
        <ShowCardStack cards={cards} index={index} onChange={onChange}>
            <PlayerCard title={title} art={art} onStart={onStart} />
        </ShowCardStack>
        {dots}
    </div>
);

/** 橫版卡疊下面「現正播放：21/10（三）· 第 3 / 5 個節目」 */
const TodayNowPlaying = ({
    date,
    index,
    total,
    standby,
}: {
    date: string;
    index: number;
    total: number;
    /** 播緊其他嘢：duration 唔係呢個節目嘅，唔講「連線中…」 */
    standby: boolean;
}) => {
    const { duration } = usePlayer();
    const label = t('today.nowPlayingIndex', {
        date: formatDateLabel(date),
        no: index + 1,
        total,
    });
    return <NowPlaying label={label} connecting={!standby && !hasKnownDuration(duration)} />;
};

interface TodayPlayerColumnProps {
    state: ReturnType<typeof useTodayPage>;
    /** 今日節目表有嘢（ready 且非空） */
    listed: boolean;
    landscape: boolean;
    /** 頁頭；橫版有節目表時搬咗去左欄，呢度就冇 */
    header: ReactNode;
    /** 卡疊下面嘅指示點；手機打橫搬咗上頁頭就冇 */
    dots: ReactNode;
}

/** 播放器欄：頁頭（直版）、載入狀態、卡疊 / 未上架提示、橫版「現正播放」 */
export const TodayPlayerColumn = ({
    state,
    listed,
    landscape,
    header,
    dots,
}: TodayPlayerColumnProps) => {
    const { status, isSearching, current, start, index, items, cards, theme, selectIndex } = state;
    return (
        <div className={`${page.playerColumn} ${page.todayColumn}`}>
            {header}
            <LoadState status={status} isEmpty={items.length === 0} isSearching={isSearching} />
            {/* 今日有節目播但一個都未上架：冇卡疊、唔自動播，節目表照列出成日（全部灰） */}
            {listed &&
                (current ? (
                    <>
                        <TodayStack
                            cards={cards}
                            index={index}
                            title={cards[index]?.title ?? ''}
                            art={start ? undefined : theme.art}
                            onStart={start}
                            onChange={selectIndex}
                            dots={dots}
                        />
                        {landscape && (
                            <TodayNowPlaying
                                date={current.date}
                                index={index}
                                total={cards.length}
                                standby={start !== undefined}
                            />
                        )}
                    </>
                ) : (
                    <TodayEmpty />
                ))}
        </div>
    );
};
