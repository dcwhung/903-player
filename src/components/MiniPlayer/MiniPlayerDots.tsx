import type { MiniPlayerTag } from '../../selectors/miniPlayer';
import { PageDots, type PageDotVariant } from '../PageDots/PageDots';
import styles from './MiniPlayer.module.css';
import type { MiniPlayerProps } from './miniPlayerTypes';

/** 指示點跟標籤色：重溫 = 藍（未揀中淡啲），今日 = 揀中時奶油金；冇標籤就普通點 */
const DOT_VARIANTS: Record<MiniPlayerTag, PageDotVariant> = { rewatch: 'blue', today: 'gold' };
const dotVariant = (tag: MiniPlayerTag | undefined): PageDotVariant | undefined =>
    tag && DOT_VARIANTS[tag];

type DotsProps = Pick<
    MiniPlayerProps,
    'keys' | 'labels' | 'index' | 'tags' | 'positionLabel' | 'onChange'
>;

/** 頂部指示點（多過一段錄音先有）：撳 = 跳去嗰個節目 */
export const MiniPlayerDots = ({ tags = [], onChange, ...dots }: DotsProps) => (
    <div className={styles.dots}>
        <PageDots {...dots} onSelect={onChange} variants={tags.map(dotVariant)} />
    </div>
);
