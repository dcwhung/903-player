/*
 * 縮圖（碟面圓形 / 橫圖長方）+ 右上角主項狀態點（mockup .thumb.st-*）。
 * 碟面冇圖 = player 預設黑碟（apps/player Disc .blank：#0a0a0a 碟 + #1e1e1e 碟邊 / 碟心，同 token 值）
 */
import type { Dot } from '../model/status';

interface ThumbProps {
    url?: string | undefined;
    dot?: Dot | undefined;
    /** xs = 短篇行 / chip 入面細碟 */
    size?: 'xs' | 'sm' | 'md';
    tile?: boolean;
}

export function Thumb({ url, dot, size = 'md', tile = false }: ThumbProps) {
    const classes = [
        'thumb',
        size === 'md' ? '' : size,
        tile ? 'tile' : '',
        !url && !tile ? 'blank' : '',
        dot ? `st-${dot}` : '',
    ];
    return (
        <span
            className={classes.filter(Boolean).join(' ')}
            style={url ? { backgroundImage: `url("${url}")` } : undefined}
            aria-hidden="true"
        />
    );
}
