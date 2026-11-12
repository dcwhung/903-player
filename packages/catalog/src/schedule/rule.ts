/*
 * 短篇排程規則（D1 schedules.rule 嘅 JSON）：形狀驗證。數值範圍（正整數、真實日子、星期 0–6）
 * 喺 expandSchedule 展開時驗，所以 API preview / PUT 都只係行同一條路。
 * 下架（_mockups_/admin-schedule-unlist ⑧）：optional `unlist`；舊 rule 嘅 removeAfterDays 照讀（= afterDays）。
 * rule 係 JSON，加欄位唔使 D1 migration
 */
import type { Weekday } from '../types/weekday';

export class ScheduleError extends Error {
    override readonly name = 'ScheduleError';
}

/** 每 N 日，或者逢星期幾 */
export type Cadence = { days: number } | { weekdays: Weekday[] };

/** 一批：由第幾集起、幾時上架 */
export interface ScheduleBatch {
    from: number;
    date: string;
}

/** 下架方式：指定日全部 / 每集上架 N 日後 / 由某日起逢星期 X 下架 N 集（由第一集起逐批） */
export type UnlistRule =
    | { kind: 'date'; date: string }
    | { kind: 'afterDays'; days: number }
    | { kind: 'periodic'; start: string; perRelease: number; every: Cadence };

interface Unlisting {
    /** 下架安排；冇 = 不下架 */
    unlist?: UnlistRule;
    /** @deprecated 舊格式（每批上架後幾多日下架）；讀嘅時候當 unlist afterDays（unlistOf），唔可以同 unlist 並存 */
    removeAfterDays?: number;
    /**
     * 已經過咗下架日嘅集數（「a-b」/「a」→ 日子，同 episodeRemovedAt 一樣）：照舊下架，
     * unlist 只排其餘集數（mockup ⑤）
     */
    unlisted?: Record<string, string>;
}

export interface DatesRule extends Unlisting {
    kind: 'dates';
    /** 每批由第幾集起、幾時上架；第一批 = 短篇 addedAt。全部已上架 + 只設下架 = 已上架嘅批次照抄 */
    batches: ScheduleBatch[];
}

export interface PeriodicRule extends Unlisting {
    kind: 'periodic';
    /** 由呢日（或者之後第一個合規嘅星期幾）起 */
    start: string;
    /** 每次上幾多集 */
    perRelease: number;
    every: Cadence;
    /** 由第幾集起按規則上架（預設第一集）；之前嘅集數跟 listed（已上架批次，照留）。同 listed 一齊出現 */
    from?: number;
    listed?: ScheduleBatch[];
}

export type ScheduleRule = DatesRule | PeriodicRule;

/** rule 嘅下架安排：新 unlist，或者舊 removeAfterDays（向後兼容） */
export const unlistOf = (rule: ScheduleRule): UnlistRule | undefined => {
    if (rule.unlist) return rule.unlist;
    return rule.removeAfterDays === undefined
        ? undefined
        : { kind: 'afterDays', days: rule.removeAfterDays };
};

type Raw = Record<string, unknown>;

const UNLISTING_KEYS = ['unlist', 'removeAfterDays', 'unlisted'];

const KEYS: Record<ScheduleRule['kind'], readonly string[]> = {
    dates: ['kind', 'batches', ...UNLISTING_KEYS],
    periodic: ['kind', 'start', 'perRelease', 'every', 'from', 'listed', ...UNLISTING_KEYS],
};

const UNLIST_KEYS: Record<UnlistRule['kind'], readonly string[]> = {
    date: ['kind', 'date'],
    afterDays: ['kind', 'days'],
    periodic: ['kind', 'start', 'perRelease', 'every'],
};

const fail = (message: string): never => {
    throw new ScheduleError(message);
};

const isRecord = (value: unknown): value is Raw =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const checkKeys = (raw: Raw, allowed: readonly string[], path: string): void => {
    const extra = Object.keys(raw).filter((key) => !allowed.includes(key));
    if (extra.length > 0) fail(`${path} has unknown keys: ${extra.join(', ')}`);
};

const checkType = (value: unknown, type: 'number' | 'string', path: string): void => {
    if (typeof value !== type) fail(`${path} must be a ${type}`);
};

const checkBatch = (batch: unknown, path: string): void => {
    if (!isRecord(batch)) return fail(`${path} must be an object`);
    checkKeys(batch, ['from', 'date'], path);
    checkType(batch.from, 'number', `${path}.from`);
    checkType(batch.date, 'string', `${path}.date`);
};

const checkBatches = (value: unknown, path: string): void => {
    if (!Array.isArray(value)) return fail(`${path} must be a list`);
    value.forEach((batch, i) => checkBatch(batch, `${path}[${i}]`));
};

const checkEvery = (every: unknown, path: string): void => {
    if (!isRecord(every)) return fail(`${path} must be an object`);
    const keys = Object.keys(every);
    if (keys.length !== 1 || !['days', 'weekdays'].includes(keys[0] ?? ''))
        fail(`${path} must have exactly one of days / weekdays`);
    if ('days' in every) checkType(every.days, 'number', `${path}.days`);
    if ('weekdays' in every && !Array.isArray(every.weekdays))
        fail(`${path}.weekdays must be a list`);
};

const checkCadence = (raw: Raw, prefix: string): void => {
    checkType(raw.start, 'string', `${prefix}start`);
    checkType(raw.perRelease, 'number', `${prefix}perRelease`);
    checkEvery(raw.every, `${prefix}every`);
};

const checkPeriodicListed = (raw: Raw): void => {
    if ((raw.from === undefined) !== (raw.listed === undefined))
        fail('from and listed must be given together');
    if (raw.from !== undefined) checkType(raw.from, 'number', 'from');
    if (raw.listed !== undefined) checkBatches(raw.listed, 'listed');
};

const checkKind = (raw: Raw): void => {
    if (raw.kind === 'dates') return checkBatches(raw.batches, 'batches');
    checkCadence(raw, '');
    checkPeriodicListed(raw);
};

const checkUnlist = (unlist: unknown): void => {
    if (!isRecord(unlist)) return fail('unlist must be an object');
    const kind = unlist.kind as UnlistRule['kind'];
    if (typeof kind !== 'string' || !Object.hasOwn(UNLIST_KEYS, kind))
        fail('unlist.kind must be "date", "afterDays" or "periodic"');
    checkKeys(unlist, UNLIST_KEYS[kind], 'unlist');
    if (kind === 'date') checkType(unlist.date, 'string', 'unlist.date');
    else if (kind === 'afterDays') checkType(unlist.days, 'number', 'unlist.days');
    else checkCadence(unlist, 'unlist.');
};

const checkUnlisted = (unlisted: unknown): void => {
    if (!isRecord(unlisted)) return fail('unlisted must be an object');
    Object.entries(unlisted).forEach(([key, date]) => checkType(date, 'string', `unlisted.${key}`));
};

const checkUnlisting = (raw: Raw): void => {
    if (raw.unlist !== undefined && raw.removeAfterDays !== undefined)
        fail('use either unlist or removeAfterDays, not both');
    if (raw.unlist !== undefined) checkUnlist(raw.unlist);
    if (raw.removeAfterDays !== undefined)
        checkType(raw.removeAfterDays, 'number', 'removeAfterDays');
    if (raw.unlisted !== undefined) checkUnlisted(raw.unlisted);
};

/** JSON（API body / D1）→ ScheduleRule；形狀唔啱就 ScheduleError */
export const parseScheduleRule = (value: unknown): ScheduleRule => {
    if (!isRecord(value)) return fail('rule must be an object');
    if (value.kind !== 'dates' && value.kind !== 'periodic')
        fail('rule.kind must be "dates" or "periodic"');
    checkKeys(value, KEYS[value.kind as ScheduleRule['kind']], 'rule');
    checkKind(value);
    checkUnlisting(value);
    return value as unknown as ScheduleRule;
};
