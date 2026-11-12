/*
 * 播放時間 roller 規則（packages/catalog admin/airTime：分鐘 ∈ 00/15/30/45；end > start 且 ≤ start + 3 小時；唔跨午夜）
 */
import { AIR_TIME_MAX_HOURS } from '@903-player/catalog';
import { pad2 } from '../model/isoDate';

const MINUTES_PER_HOUR = 60;
const QUARTER = 15;
const LAST_SLOT = 23 * MINUTES_PER_HOUR + 45;
const MAX_DURATION = AIR_TIME_MAX_HOURS * MINUTES_PER_HOUR;

export const toMinutes = (time: string): number => {
    const [h = 0, m = 0] = time.split(':').map(Number);
    return h * MINUTES_PER_HOUR + m;
};

export const toTime = (minutes: number): string =>
    `${pad2(Math.floor(minutes / MINUTES_PER_HOUR))}:${pad2(minutes % MINUTES_PER_HOUR)}`;

const range = (from: number, to: number): string[] =>
    Array.from({ length: Math.max(0, (to - from) / QUARTER + 1) }, (_, i) =>
        toTime(from + i * QUARTER),
    );

/** 開始：要留位畀最少 15 分鐘 */
export const startOptions = (): string[] => range(0, LAST_SLOT - QUARTER);

export const endOptions = (start: string): string[] => {
    const from = toMinutes(start) + QUARTER;
    return range(from, Math.min(toMinutes(start) + MAX_DURATION, LAST_SLOT));
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** 改開始時間：盡量保持節目長度，超出範圍就收窄 */
export const adjustEnd = (prevStart: string, prevEnd: string, nextStart: string): string => {
    const duration = clamp(toMinutes(prevEnd) - toMinutes(prevStart), QUARTER, MAX_DURATION);
    const options = endOptions(nextStart);
    const wanted = toMinutes(nextStart) + duration;
    const last = toMinutes(options.at(-1) ?? nextStart);
    return toTime(clamp(wanted, toMinutes(options[0] ?? nextStart), last));
};

export const hoursOf = (options: readonly string[]): string[] => [
    ...new Set(options.map((o) => o.slice(0, 2))),
];

export const minutesOf = (options: readonly string[], hour: string): string[] =>
    options.filter((o) => o.startsWith(`${hour}:`)).map((o) => o.slice(3));

const nearest = (options: readonly string[], target: number): string =>
    options.reduce((best, o) =>
        Math.abs(toMinutes(o) - target) < Math.abs(toMinutes(best) - target) ? o : best,
    );

export const withHour = (options: readonly string[], current: string, hour: string): string =>
    nearest(
        options.filter((o) => o.startsWith(`${hour}:`)),
        toMinutes(`${hour}:${current.slice(3)}`),
    );

export const withMinute = (options: readonly string[], current: string, minute: string): string => {
    const wanted = `${current.slice(0, 2)}:${minute}`;
    return options.includes(wanted) ? wanted : nearest(options, toMinutes(wanted));
};
