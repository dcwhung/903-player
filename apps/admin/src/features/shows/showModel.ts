/* 節目編輯：讀寫 definition 欄位、新增節目嘅起始 definition */
import { NEUTRAL_THEME, type AirTime, type Weekday } from '@903-player/catalog';
import type { RawDefinition } from '../../api/types';
import { isRecord, str, strList } from '../../model/raw';
import type { TimeRange } from '../../ui/TimeRoller';

/** 冇播放時間時 roller 由呢度開始（撳咗先寫入） */
export const DEFAULT_AIR_TIME: TimeRange = { start: '15:00', end: '16:00' };

export const airDaysOf = (definition: RawDefinition): Weekday[] =>
    (Array.isArray(definition.airDays) ? definition.airDays : []).filter(
        (d): d is Weekday => Number.isInteger(d) && d >= 0 && d <= 6,
    );

export const airTimeOf = (definition: RawDefinition): AirTime | undefined => {
    const value = definition.airTime;
    if (!isRecord(value) || typeof value.start !== 'string' || typeof value.end !== 'string')
        return undefined;
    return { start: value.start, end: value.end };
};

export const hostsOf = (definition: RawDefinition): string[] => strList(definition, 'hosts');

/** 空字串 / 空 list 就刪走欄位（optional 欄位唔寫空值） */
export const withOptional = (definition: RawDefinition, key: string, value: unknown) => {
    const empty = value === '' || (Array.isArray(value) && value.length === 0);
    const rest = Object.fromEntries(Object.entries(definition).filter(([k]) => k !== key));
    return empty ? rest : { ...rest, [key]: value };
};

export const summaryOf = (definition: RawDefinition) => str(definition, 'summary') ?? '';

/** show.json theme 冇 art（player runtime 先補） */
const theme = Object.fromEntries(Object.entries(NEUTRAL_THEME).filter(([key]) => key !== 'art'));

/** 新節目：預設下架（填好資料、上載圖先上架），中性色調 */
export const newShowDefinition = (): RawDefinition => ({
    name: '',
    fileTime: '',
    airDays: [],
    tile: 'tile.webp',
    disc: 'disc.webp',
    theme,
    enabled: false,
});

export const toggleDay = (days: readonly Weekday[], day: Weekday): Weekday[] =>
    days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b);
