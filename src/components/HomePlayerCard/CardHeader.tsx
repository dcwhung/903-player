import type { MiniPlayerTag } from '../../selectors/miniPlayer';
import { t } from '../../i18n/t';
import { TRANSITION_NAME } from '../../utils/viewTransition';
import { Disc } from '../Disc/Disc';
import { ExpandIcon } from '../icons/icons';
import type { MiniPlayerProps } from '../MiniPlayer/MiniPlayer';
import { dotVariant } from '../MiniPlayer/MiniPlayerDots';
import { PageDots } from '../PageDots/PageDots';
import styles from './HomePlayerCard.module.css';

const EXPAND_ICON_SIZE = 18;

/** 播放卡頂嘅頁頭列：細碟 + 節目名 + ⤢，成條撳得入節目 / 劇集頁 */
interface CardHeaderProps {
    name: string;
    art: string | undefined;
    openLabel: string;
    onExpand: () => void;
    focusOnMount: boolean;
    /** 今日 / 重溫標籤（同 mini player 一樣） */
    tag: MiniPlayerTag | undefined;
}

export const CardHeader = ({
    name,
    art,
    openLabel,
    onExpand,
    focusOnMount,
    tag,
}: CardHeaderProps) => (
    <button
        type="button"
        className={styles.header}
        aria-label={openLabel}
        onClick={onExpand}
        // 用戶撳把手再出返張卡：焦點跟去張卡（自動因播放再出返就唔搶焦點，S-630）
        autoFocus={focusOnMount}
    >
        <Disc size="small" art={art} />
        <span className={styles.name} style={{ viewTransitionName: TRANSITION_NAME.title }}>
            {name}
        </span>
        {/* 開頁掣 aria-label 已經講埋重溫，標籤只係睇嘅 */}
        {tag && (
            <span className={styles.tag} data-tag={tag} aria-hidden="true">
                {t(`miniPlayer.tag.${tag}`)}
            </span>
        )}
        <span className={styles.expand} aria-hidden="true">
            <ExpandIcon size={EXPAND_ICON_SIZE} />
        </span>
    </button>
);

export type CardSwitchProps = Pick<
    MiniPlayerProps,
    'keys' | 'labels' | 'index' | 'tags' | 'positionLabel' | 'onChange'
>;

/** 今日多個節目：頁頭列下面嘅指示點（同 mini player 一樣顏色），撳 = 轉去嗰個節目 */
export const CardDots = ({ tags = [], onChange, ...dots }: CardSwitchProps) => (
    <div className={styles.dots}>
        <PageDots {...dots} onSelect={onChange} variants={tags.map(dotVariant)} />
    </div>
);
