/* 即將上架 ⏱ / 快將下架 ⏳（P8 #6） */
import { StrokeIcon, type IconProps } from './strokeIcon';

/** 時鐘 / 沙漏線粗少少：喺細字旁邊都睇得清（同 mockup 一樣） */
const NOTICE_STROKE_WIDTH = 2.2;

/** 時鐘 ⏱：即將上架（chip、一覽表、集數清單、主頁新劇灰格），同 mockup _mockups_/coming-soon CLOCK 一樣 */
export const ClockIcon = (props: IconProps) => (
    <StrokeIcon strokeWidth={NOTICE_STROKE_WIDTH} {...props}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
    </StrokeIcon>
);

/** 沙漏 ⏳：快將下架（琥珀色），同 mockup HOURGLASS 一樣 */
export const HourglassIcon = (props: IconProps) => (
    <StrokeIcon strokeWidth={NOTICE_STROKE_WIDTH} {...props}>
        <path d="M7 3.5h10M7 20.5h10M8 3.5c0 4.5 8 4.5 8 8.5s-8 4-8 8.5M16 3.5c0 4.5-8 4.5-8 8.5s8 4 8 8.5" />
    </StrokeIcon>
);
