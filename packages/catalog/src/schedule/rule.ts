/*
 * 短篇排程規則（D1 schedules.rule 嘅 JSON）：形狀驗證。數值範圍（正整數、真實日子、星期 0–6）
 * 喺 expandSchedule 展開時驗，所以 API preview / PUT 都只係行同一條路
 */
import type { Weekday } from '../types/weekday';

export class ScheduleError extends Error {
    override readonly name = 'ScheduleError';
}

export interface DatesRule {
    kind: 'dates';
    /** 每批由第幾集起、幾時上架；第一批 = 短篇 addedAt */
    batches: { from: number; date: string }[];
    /** 每批上架後幾多日下架（每批各自計） */
    removeAfterDays?: number;
}

export interface PeriodicRule {
    kind: 'periodic';
    /** 由呢日（或者之後第一個合規嘅星期幾）起 */
    start: string;
    /** 每次上幾多集 */
    perRelease: number;
    every: { days: number } | { weekdays: Weekday[] };
    removeAfterDays?: number;
}

export type ScheduleRule = DatesRule | PeriodicRule;

type Raw = Record<string, unknown>;

const KEYS: Record<ScheduleRule['kind'], readonly string[]> = {
    dates: ['kind', 'batches', 'removeAfterDays'],
    periodic: ['kind', 'start', 'perRelease', 'every', 'removeAfterDays'],
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

const checkBatch = (batch: unknown, index: number): void => {
    const path = `batches[${index}]`;
    if (!isRecord(batch)) return fail(`${path} must be an object`);
    checkKeys(batch, ['from', 'date'], path);
    checkType(batch.from, 'number', `${path}.from`);
    checkType(batch.date, 'string', `${path}.date`);
};

const checkEvery = (every: unknown): void => {
    if (!isRecord(every)) return fail('every must be an object');
    const keys = Object.keys(every);
    if (keys.length !== 1 || !['days', 'weekdays'].includes(keys[0] ?? ''))
        fail('every must have exactly one of days / weekdays');
    if ('days' in every) checkType(every.days, 'number', 'every.days');
    if ('weekdays' in every && !Array.isArray(every.weekdays))
        fail('every.weekdays must be a list');
};

const checkKind = (raw: Raw): void => {
    if (raw.kind === 'dates') {
        if (!Array.isArray(raw.batches)) fail('batches must be a list');
        (raw.batches as unknown[]).forEach(checkBatch);
        return;
    }
    checkType(raw.start, 'string', 'start');
    checkType(raw.perRelease, 'number', 'perRelease');
    checkEvery(raw.every);
};

/** JSON（API body / D1）→ ScheduleRule；形狀唔啱就 ScheduleError */
export const parseScheduleRule = (value: unknown): ScheduleRule => {
    if (!isRecord(value)) return fail('rule must be an object');
    if (value.kind !== 'dates' && value.kind !== 'periodic')
        fail('rule.kind must be "dates" or "periodic"');
    checkKeys(value, KEYS[value.kind as ScheduleRule['kind']], 'rule');
    checkKind(value);
    if (value.removeAfterDays !== undefined)
        checkType(value.removeAfterDays, 'number', 'removeAfterDays');
    return value as unknown as ScheduleRule;
};
