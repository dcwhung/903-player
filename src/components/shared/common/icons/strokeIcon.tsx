/* 線條 icon 共用底（icons.tsx、noticeIcons.tsx） */
import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const DEFAULT_ICON_SIZE = 24;

/** 跟 tokens.css 嘅 --ui-scale 放大（橫版大畫面）；width / height attribute 留做冇 CSS 時嘅後備 */
const scaledSize = (size: number) => `calc(${size}px * var(--ui-scale, 1))`;

export const StrokeIcon = ({ size = DEFAULT_ICON_SIZE, children, style, ...rest }: IconProps) => (
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
