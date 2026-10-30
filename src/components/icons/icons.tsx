import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const DEFAULT_ICON_SIZE = 24;

/** 跟 tokens.css 嘅 --ui-scale 放大（橫版大畫面）；width / height attribute 留做冇 CSS 時嘅後備 */
const scaledSize = (size: number) => `calc(${size}px * var(--ui-scale, 1))`;

const StrokeIcon = ({ size = DEFAULT_ICON_SIZE, children, style, ...rest }: IconProps) => (
    <svg
        width={size}
        height={size}
        style={{ width: scaledSize(size), height: scaledSize(size), ...style }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
    >
        {children}
    </svg>
);

export const BackIcon = (props: IconProps) => (
    <StrokeIcon {...props}>
        <path d="M15 18l-6-6 6-6" />
    </StrokeIcon>
);

export const CalendarIcon = (props: IconProps) => (
    <StrokeIcon {...props}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
    </StrokeIcon>
);

export const RestartIcon = (props: IconProps) => (
    <StrokeIcon {...props}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
    </StrokeIcon>
);

export const CloseIcon = (props: IconProps) => (
    <StrokeIcon {...props}>
        <path d="M18 6L6 18M6 6l12 12" />
    </StrokeIcon>
);

/** 展開 ⤢：主頁播放卡入節目 / 劇集頁 */
export const ExpandIcon = (props: IconProps) => (
    <StrokeIcon {...props}>
        <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    </StrokeIcon>
);

/** 電源 ⏻：mini player 左滑露出嘅「關閉」掣 */
export const PowerIcon = (props: IconProps) => (
    <StrokeIcon {...props}>
        <path d="M12 3v9" />
        <path d="M6.3 6.3a8 8 0 1 0 11.4 0" />
    </StrokeIcon>
);

/** 「全部短篇」：三條橫線 */
export const ListIcon = (props: IconProps) => (
    <StrokeIcon {...props}>
        <path d="M4 6h16M4 12h16M4 18h16" />
    </StrokeIcon>
);

export const CheckIcon = (props: IconProps) => (
    <StrokeIcon strokeWidth={4} {...props}>
        <path d="M20 6L9 17l-5-5" />
    </StrokeIcon>
);

export const PauseIcon = (props: IconProps) => (
    <StrokeIcon strokeWidth={3} {...props}>
        <path d="M8.5 5v14M15.5 5v14" />
    </StrokeIcon>
);

export const PlayIcon = ({ filled = true, ...props }: IconProps & { filled?: boolean }) => (
    <StrokeIcon
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        {...props}
    >
        <path d="M7.5 4.8v14.4l11.5-7.2z" />
    </StrokeIcon>
);

/** 聲波 5 條：x 位置同高度（viewBox 24×24，跟 mockup 今日掣右下角） */
const WAVE_BAR_XS = [2, 7, 12, 17, 22];
const WAVE_BAR_HEIGHTS = [8, 16, 22, 12, 6];
const WAVE_BAR_WIDTH = 2.5;
const WAVE_CENTER_Y = 12;

/** 裝飾用聲波（圓頭直條）；圓頭會凸出半條線闊，所以線段兩頭先扣返 */
export const SoundWaveIcon = (props: IconProps) => (
    <StrokeIcon strokeWidth={WAVE_BAR_WIDTH} {...props}>
        {WAVE_BAR_XS.map((x, i) => {
            const half = (WAVE_BAR_HEIGHTS[i] ?? 0) / 2 - WAVE_BAR_WIDTH / 2;
            return (
                <line key={x} x1={x} x2={x} y1={WAVE_CENTER_Y - half} y2={WAVE_CENTER_Y + half} />
            );
        })}
    </StrokeIcon>
);
