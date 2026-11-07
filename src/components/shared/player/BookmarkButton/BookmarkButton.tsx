import type { MouseEvent } from 'react';
import { t } from '../../../../i18n/t';
import { toggleBookmark, useIsBookmarked } from '../../../../services/bookmarkStore';
import type { Track } from '../../../../types/track';
import { StarIcon } from '../../common/icons/icons';
import { showToast } from '../../common/Toast/toastStore';
import styles from './BookmarkButton.module.css';

const STAR_ICON_SIZE = 22;

interface BookmarkButtonProps {
    track: Track;
    /** 讀屏名（集數清單講埋日子 / 集數）；收藏咗未由 aria-pressed 講 */
    label: string;
    className?: string;
    /**
     * 未揀任何一集（例如短篇劇集頁「揀一個短篇開始收聽」）：變淡、aria-disabled（Tab / 讀屏照行到），
     * 撳落乜都唔做、唔出短提示
     */
    disabled?: boolean;
}

/**
 * 收藏掣（_mockups_/bookmark I1）：☆ 撳 = 收藏、★ 撳 = 移除，冇確認框，出短提示。
 * 唔畀 click 傳去後面嗰行（集數清單撳行會播 / 入頁）
 */
export const BookmarkButton = ({
    track,
    label,
    className = '',
    disabled = false,
}: BookmarkButtonProps) => {
    const saved = useIsBookmarked(track.id);
    const onClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (disabled) return;
        const added = toggleBookmark(track);
        showToast(t(added ? 'bookmark.added' : 'bookmark.removed'));
    };
    return (
        <button
            type="button"
            className={`${styles.bookmark} ${className}`}
            aria-pressed={saved}
            aria-label={label}
            aria-disabled={disabled ? 'true' : undefined}
            onClick={onClick}
        >
            <StarIcon size={STAR_ICON_SIZE} filled={saved} />
        </button>
    );
};
