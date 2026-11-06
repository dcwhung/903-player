import { zhHK } from './zh-HK';

type Messages = typeof zhHK;

/** 將巢狀字典展平成 'home.today' 呢類 key */
type LeafKeys<T, Prefix extends string = ''> = {
    [K in keyof T & string]: T[K] extends string
        ? `${Prefix}${K}`
        : LeafKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = LeafKeys<Messages>;
export type MessageParams = Record<string, string | number>;

const PARAM_PATTERN = /\{(\w+)\}/g;

const lookup = (key: MessageKey): string =>
    key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], zhHK) as string;

/** 字典入面嘅 {sep} 預設填 common.separator（S-717）；讀屏句傳 sep = common.spokenSeparator 蓋過 */
const DEFAULT_PARAMS: MessageParams = { sep: lookup('common.separator') };

export const t = (key: MessageKey, params: MessageParams = {}): string => {
    const filled = { ...DEFAULT_PARAMS, ...params };
    return lookup(key).replace(PARAM_PATTERN, (placeholder, name: string) =>
        name in filled ? String(filled[name]) : placeholder,
    );
};
