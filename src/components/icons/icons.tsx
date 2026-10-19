import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const DEFAULT_ICON_SIZE = 24;

const StrokeIcon = ({ size = DEFAULT_ICON_SIZE, children, ...rest }: IconProps) => (
    <svg
        width={size}
        height={size}
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

export const RadioIcon = (props: IconProps) => (
    <StrokeIcon {...props}>
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
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
