import { t, type MessageKey } from '../../../../i18n/t';
import type { Recording } from '../../../../types/recording';
import { formatSpokenDate } from '../../../../utils/date';
import { Disc } from '../../../shared/common/Disc/Disc';
import { PauseIcon, PlayIcon } from '../../../shared/common/icons/icons';
import { Marquee } from '../../../shared/common/Marquee/Marquee';
import { SpokenText, type SpokenNotice } from '../../../shared/common/SpokenText/SpokenText';
import { BookmarkButton } from '../../../shared/player/BookmarkButton/BookmarkButton';
import type { ShowStatus, TodayShowItem } from './TodayShowList';
import styles from './TodayShowList.module.css';
import { RowStatus } from './TodayShowRowParts';

const STATUS_MESSAGE: Record<ShowStatus, MessageKey> = {
    playing: 'common.status.playing',
    connecting: 'episodes.connecting',
    watched: 'common.status.watched',
    unwatched: 'common.status.unwatched',
    unavailable: 'today.statusUnavailable',
};
const PLAY_ICON_SIZE = 22;

/** 未上架嗰行嘅「15:10 · 未上架」：讀屏版用「，」，唔讀「·」（S-723，同 S-717 一樣） */
const unavailableStatus = (time: string): SpokenNotice => {
    const params = { time, status: t(STATUS_MESSAGE.unavailable) };
    return {
        text: t('today.timeWithStatus', params),
        label: t('today.timeWithStatus', { ...params, sep: t('common.spokenSeparator') }),
    };
};

/**
 * 未上架：照列出節目同時間，但唔係掣（撳唔到、冇播放掣），唱片同節目名變淡。
 * 用普通 div：screen reader 直接讀節目名同讀屏版狀態（時間，未上架），唔會當成停用咗嘅掣
 */
const UnavailableRow = ({ item }: { item: TodayShowItem }) => (
    <div className={`${styles.item} ${styles.unavailable}`}>
        <span className={styles.art}>
            <Disc size="small" art={item.art} />
        </span>
        <span className={styles.text}>
            <Marquee className={styles.name} text={item.name} />
            <span className={styles.status}>
                <SpokenText {...unavailableStatus(item.time)} />
            </span>
        </span>
    </div>
);

/** ☆ 讀屏名講埋節目名同讀屏日子（C4：「收藏 公子會 06/11 星期五」） */
const bookmarkLabel = (name: string, track: Recording): string =>
    t('bookmark.toggleEpisode', {
        label: t('bookmark.episodeOf', { name, label: formatSpokenDate(track.date) }),
    });

interface ShowRowProps {
    item: TodayShowItem;
    onSelect: (key: string) => void;
}

export const ShowRow = ({ item, onSelect }: ShowRowProps) => {
    if (item.status === 'unavailable') {
        return <UnavailableRow item={item} />;
    }
    const statusText = t(STATUS_MESSAGE[item.status]);
    // 播緊（status playing = 揀中 + 播放中）：掣變暫停，撳落去暫停
    const isPlaying = item.status === 'playing' || item.status === 'connecting';
    // 收藏掣唔可以放入行掣入面：行入面留位，星疊喺個位上面（同一個 li）
    return (
        <>
            <button
                type="button"
                className={`${styles.item} ${item.active ? styles.active : ''}`}
                aria-current={item.active ? 'true' : undefined}
                aria-label={t(
                    isPlaying ? 'today.pauseShowWithStatus' : 'today.playShowWithStatus',
                    {
                        name: item.name,
                        status: statusText,
                    },
                )}
                onClick={() => onSelect(item.key)}
            >
                <Disc size="small" art={item.art} />
                <span className={styles.text}>
                    <Marquee className={styles.name} text={item.name} />
                    <RowStatus item={item} statusText={statusText} />
                </span>
                {item.track && <span className={styles.bookmarkSpace} aria-hidden="true" />}
                {isPlaying ? (
                    <PauseIcon size={PLAY_ICON_SIZE} />
                ) : (
                    <PlayIcon size={PLAY_ICON_SIZE} filled={false} />
                )}
            </button>
            {item.track && (
                <BookmarkButton
                    track={item.track}
                    label={bookmarkLabel(item.name, item.track)}
                    className={styles.bookmark}
                />
            )}
        </>
    );
};
