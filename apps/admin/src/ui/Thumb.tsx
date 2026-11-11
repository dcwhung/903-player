/* 縮圖（唱片圓形 / 橫額長方）+ 右上角主項狀態點（mockup .thumb.st-*） */
import type { Dot } from '../model/status';

interface ThumbProps {
    url?: string | undefined;
    dot?: Dot | undefined;
    size?: 'sm' | 'md';
    tile?: boolean;
}

export function Thumb({ url, dot, size = 'md', tile = false }: ThumbProps) {
    const classes = [
        'thumb',
        size === 'sm' ? 'sm' : '',
        tile ? 'tile' : '',
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
