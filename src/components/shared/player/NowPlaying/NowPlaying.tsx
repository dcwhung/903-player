import { t } from '../../../../i18n/t';
import { PLAYBACK_LINE_KEY, type PlaybackLineState } from '../../../../utils/playbackState';
import { HourglassIcon } from '../../common/icons/icons';
import { Marquee } from '../../common/Marquee/Marquee';
import { SpokenText, type SpokenNotice } from '../../common/SpokenText/SpokenText';
import { VisuallyHidden } from '../../common/VisuallyHidden/VisuallyHidden';
import styles from './NowPlaying.module.css';

interface NowPlayingProps {
    /** 「現正播放：」後面嘅字（例如 21/10（三）、好朋友手牽手 · 第 2 / 4 集） */
    label: string;
    /** 讀屏版 label（日子講「星期一」、分隔用「，」，S-723）；冇就讀畫面字 */
    spokenLabel?: string | undefined;
    /** 第二行淡色細字（例如廣播劇集名）；冇就得一行 */
    detail?: string | undefined;
    /** 未讀到時長（例如斷網）：第一行改為「連線中…」 */
    connecting: boolean;
    /** 字眼：預設「現正播放」；廣播劇頁暫停講「已暫停」、未開始講「下一集」、未載入叫用戶揀短篇 */
    status?: PlaybackLineState;
    /**
     * 成套劇快將下架（琥珀色 ⏳，P8 #6）：未載入（unloaded）就取代「揀一個短篇開始收聽」；
     * 聽緊就放喺第二行（「現正播放」下面，取代集名，高度唔變）。讀屏讀 label（讀屏版日子，W-537）
     */
    notice?: SpokenNotice | undefined;
}

const NOTICE_ICON_SIZE = 12;

const NoticeLine = ({
    notice,
    className,
}: {
    notice: SpokenNotice;
    className: string | undefined;
}) => (
    <span className={`${className} ${styles.notice}`}>
        <HourglassIcon size={NOTICE_ICON_SIZE} />
        <SpokenText {...notice} />
    </span>
);

/**
 * 橫版唱片下面嘅「現正播放」（直版用日子條 / 短篇 chips 上面嘅標籤）。
 * 放唔落同直版一樣用 … 收尾，唔捲（只有清單播緊嗰行先跑馬燈）；高度固定（tokens.css --now-playing-*），唱片大細先計得準
 */
/** 第二行：聽緊而且快將下架 → 下架字；否則集名（冇就冇） */
const SecondLine = ({
    detail,
    notice,
}: {
    detail?: string | undefined;
    notice?: SpokenNotice | undefined;
}) => {
    if (notice) return <NoticeLine className={styles.detail} notice={notice} />;
    return detail ? <Marquee className={styles.detail} text={detail} animate={false} /> : null;
};

/** 第一行：連線中 / 「現正播放：…」；有讀屏版就畫面字收埋，另外讀讀屏版 */
const FirstLine = ({
    label,
    spokenLabel,
    connecting,
    status,
}: Pick<NowPlayingProps, 'label' | 'spokenLabel' | 'connecting'> & {
    status: PlaybackLineState;
}) => {
    // 讀屏版同畫面一樣就唔使兩份
    const spoken = !connecting && spokenLabel !== undefined && spokenLabel !== label;
    const text = connecting ? t('episodes.connecting') : t(PLAYBACK_LINE_KEY[status], { label });
    return (
        <>
            <Marquee className={styles.line} animate={false} text={text} hidden={spoken} />
            {spoken && (
                <VisuallyHidden>
                    {t(PLAYBACK_LINE_KEY[status], { label: spokenLabel })}
                </VisuallyHidden>
            )}
        </>
    );
};

export const NowPlaying = ({
    label,
    spokenLabel,
    detail,
    connecting,
    status = 'playing',
    notice,
}: NowPlayingProps) => {
    const replaces = status === 'unloaded' && notice !== undefined;
    return (
        <div className={styles.group}>
            {replaces ? (
                <NoticeLine className={styles.line} notice={notice} />
            ) : (
                <FirstLine
                    label={label}
                    spokenLabel={spokenLabel}
                    connecting={connecting}
                    status={status}
                />
            )}
            <SecondLine detail={detail} notice={replaces ? undefined : notice} />
        </div>
    );
};
