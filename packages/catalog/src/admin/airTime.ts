/*
 * 節目播放時間（show.json 嘅 airTime，P9.5 預備）：驗證 + 顯示文字（admin 預覽同將來 player 共用）。
 * 規則：HH:MM（00:00–23:45，分鐘只可以 00 / 15 / 30 / 45）；完結遲過開始、最多開始後 3 小時；
 * 唔可以過午夜（完結 ≤ 23:45），所以 23:45 開始嘅節目寫唔到 airTime
 */
import type { Weekday } from '../types/weekday';

export interface AirTime {
    /** HH:MM */
    start: string;
    /** HH:MM：遲過 start，最多 start + 3 小時 */
    end: string;
}

/** HH:MM，分鐘 15 分鐘一格（schemas/show.schema.json 同一條） */
export const AIR_TIME_PATTERN_SOURCE = '^([01][0-9]|2[0-3]):(00|15|30|45)$';
const AIR_TIME_PATTERN = new RegExp(AIR_TIME_PATTERN_SOURCE);
const MINUTES_PER_HOUR = 60;
/** 完結最多開始後幾多小時 */
export const AIR_TIME_MAX_HOURS = 3;
const MAX_DURATION_MINUTES = AIR_TIME_MAX_HOURS * MINUTES_PER_HOUR;
const AIR_TIME_KEYS: readonly string[] = ['start', 'end'];

const SUNDAY = 0;
const SATURDAY = 6;
/** 一星期由星期一排到星期日（日曆 weekday 0 = 星期日排最尾） */
const WEEK_LENGTH = 7;
/** 連續幾多日先用「至」（兩日就寫「、」） */
const MIN_RANGE_DAYS = 3;
const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'] as const;
const WEEKDAY_PREFIX = '星期';
const EVERY_DAY = '每日';
const RANGE_JOINER = '至';
const LIST_JOINER = '、';

const toMinutes = (time: string): number => {
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    return hours * MINUTES_PER_HOUR + minutes;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const timeProblem = (raw: Record<string, unknown>, key: 'start' | 'end'): string | undefined => {
    const value = raw[key];
    return typeof value === 'string' && AIR_TIME_PATTERN.test(value)
        ? undefined
        : `airTime.${key} must be HH:MM in 15-minute steps (00:00–23:45)`;
};

/** 合規就 undefined；唔合規回傳原因（寫明欄位，同 parser 錯誤一樣格式） */
export const airTimeProblem = (value: unknown): string | undefined => {
    if (!isRecord(value)) return 'airTime must be an object { start, end }';
    const unknown = Object.keys(value).find((key) => !AIR_TIME_KEYS.includes(key));
    if (unknown !== undefined) return `airTime: unknown key ${unknown}`;
    const problem = timeProblem(value, 'start') ?? timeProblem(value, 'end');
    if (problem !== undefined) return problem;
    const [start, end] = [toMinutes(value.start as string), toMinutes(value.end as string)];
    if (end <= start) return 'airTime.end must be after start (same day)';
    return end - start > MAX_DURATION_MINUTES
        ? `airTime.end must be within ${AIR_TIME_MAX_HOURS} hours of start`
        : undefined;
};

/** 星期一 = 0 … 星期日 = 6（顯示次序） */
const weekPosition = (day: Weekday): number => (day === SUNDAY ? SATURDAY : day - 1);
const dayAt = (position: number): string => DAY_NAMES[(position + 1) % WEEK_LENGTH] ?? '';

/** 排好嘅位置 → 連續段 */
const runsOf = (positions: readonly number[]): number[][] =>
    positions.reduce<number[][]>((runs, position) => {
        const last = runs.at(-1);
        if (last && last.at(-1) === position - 1) last.push(position);
        else runs.push([position]);
        return runs;
    }, []);

const runText = (run: readonly number[]): string =>
    run.length >= MIN_RANGE_DAYS
        ? `${dayAt(run[0] ?? 0)}${RANGE_JOINER}${dayAt(run.at(-1) ?? 0)}`
        : run.map(dayAt).join(LIST_JOINER);

/** 「星期一至五」「星期六、日」「星期一、三、五」；七日都播 =「每日」 */
export const formatAirDays = (airDays: readonly Weekday[]): string => {
    const positions = [...new Set(airDays.map(weekPosition))].sort((a, b) => a - b);
    if (positions.length === WEEK_LENGTH) return EVERY_DAY;
    return `${WEEKDAY_PREFIX}${runsOf(positions).map(runText).join(LIST_JOINER)}`;
};

/** 「星期一至五（15:00 - 16:30）」（admin 節目列表 meta / 預覽，3c）；冇 airTime 就淨係星期幾 */
export const formatAirTime = (
    airDays: readonly Weekday[],
    airTime: AirTime | undefined,
): string => {
    const days = formatAirDays(airDays);
    return airTime ? `${days}（${airTime.start} - ${airTime.end}）` : days;
};
