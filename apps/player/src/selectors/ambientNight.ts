import { AMBIENT_NIGHT_FRACTION, NIGHT_END_HOUR } from '../config/constants';

export const AMBIENT_NIGHT = { DAY: 'day', NIGHT: 'night' } as const;
export type AmbientNightState = (typeof AMBIENT_NIGHT)[keyof typeof AMBIENT_NIGHT];

export interface AmbientNightInput {
    /** 開緊嘅睡眠 timer：開始時刻 + 剩餘比例（1 → 0，「播完呢集」用自己嘅總長） */
    timer: { startedAt: number; fraction: number } | null;
    /** timer 時間到停咗播、用戶仲未掂過（叫醒 / 撳播 / 再開 timer 就係 null）：嗰個 timer 幾時開始 */
    expiry: { startedAt: number } | null;
    now: number;
}

/**
 * from 之後（唔包 from 本身）第一個裝置本地 05:00 喺 to 或之前未。
 * 用時間戳計（唔靠 useNightWindow 由 true 變 false 嗰下）：背景 / 重新載入錯過咗 05:00 都照計到
 */
export const crossedDawn = (from: number, to: number): boolean => {
    const dawn = new Date(from);
    dawn.setHours(NIGHT_END_HOUR, 0, 0, 0);
    if (dawn.getTime() <= from) dawn.setDate(dawn.getDate() + 1);
    return to >= dawn.getTime();
};

/**
 * 9c 閒置畫面夜間低光（用戶 2026-11-20）：
 * - 轉暗只睇 timer：開緊、行咗三分一（fraction ≤ 2/3）；時間到停咗播就一直暗到有人掂
 * - 05:00 只負責轉返光：嗰個 timer 開始之後過咗 05:00 就唔再暗（時間到都唔再暗）
 */
export const ambientNightState = ({ timer, expiry, now }: AmbientNightInput): AmbientNightState => {
    const source = timer ?? expiry;
    if (!source || crossedDawn(source.startedAt, now)) return AMBIENT_NIGHT.DAY;
    const dark = timer ? timer.fraction <= AMBIENT_NIGHT_FRACTION : true;
    return dark ? AMBIENT_NIGHT.NIGHT : AMBIENT_NIGHT.DAY;
};
