import type { ReactNode } from 'react';
import { t } from '../../../../i18n/t';
import { PERCENT, toPercent } from '../../../../utils/ratio';
import styles from './MiniPlayer.module.css';

interface MiniPlayerProgressProps {
    /** 0–1 */
    progress: number;
    /** 例如「12:40 / 1:58:30」；未知長度時冇 */
    timeText?: string;
    /** 圈入面嘅播放 / 暫停掣 */
    children: ReactNode;
}

/*
 * viewBox 用播放掣原本嘅 44 × 44（--touch-target），外圈粗幼 3（--mini-progress-ring）：
 * 成個 SVG 跟 --ui-scale 縮放，圈同 CSS 留嘅位（.toggle padding）一齊放大，唔會錯開
 */
const VIEW_BOX_SIZE = 44;
const RING_WIDTH = 3;
const CENTER = VIEW_BOX_SIZE / 2;
const RADIUS = CENTER - RING_WIDTH / 2;
/*
 * 圓周（唔用 pathLength：舊版 iOS Safari 對 circle 嘅 pathLength 計 dash 唔準），
 * 小數留兩個位，每秒更新唔使出長串數字
 */
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DASH_DECIMALS = 2;
/** 由 3 點（SVG 圓起點）轉去 12 點，之後順時針 */
const START_AT_TOP = `rotate(-90 ${CENTER} ${CENTER})`;

/**
 * 播放進度外圈（M7）：包住播放 / 暫停掣，由 12 點順時針；軌道淡色。
 * 掣同 progressbar 係兄弟（唔放入 button 入面），讀屏照讀到「暫停」掣同「播放進度」；
 * 圈本身唔收 tap（pointer-events: none），撳落去係個掣（成格 44px）
 */
export const MiniPlayerProgress = ({ progress, timeText, children }: MiniPlayerProgressProps) => {
    const percent = toPercent(progress);
    const dash = ((CIRCUMFERENCE * percent) / PERCENT).toFixed(DASH_DECIMALS);
    return (
        <div className={styles.toggleRing}>
            {children}
            <div
                className={styles.ring}
                role="progressbar"
                aria-label={t('player.progress')}
                aria-valuetext={timeText}
                aria-valuemin={0}
                aria-valuemax={PERCENT}
                aria-valuenow={percent}
            >
                <svg
                    viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
                    aria-hidden="true"
                    focusable="false"
                >
                    <circle
                        className={styles.ringTrack}
                        cx={CENTER}
                        cy={CENTER}
                        r={RADIUS}
                        fill="none"
                        strokeWidth={RING_WIDTH}
                    />
                    {/* 跟 aria-valuenow 嘅整數百分比畫；butt 端，0% 唔會出一點 */}
                    <circle
                        className={styles.ringFill}
                        cx={CENTER}
                        cy={CENTER}
                        r={RADIUS}
                        fill="none"
                        strokeWidth={RING_WIDTH}
                        strokeLinecap="butt"
                        strokeDasharray={`${dash} ${CIRCUMFERENCE.toFixed(DASH_DECIMALS)}`}
                        transform={START_AT_TOP}
                    />
                </svg>
            </div>
        </div>
    );
};
