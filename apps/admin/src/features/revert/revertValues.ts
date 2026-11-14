/*
 * 還原確認框 / 編輯頁「已發佈：…」嘅值：圖 = URL、配色 = 色塊、其他 = 文字
 * （上下架寫「上架 / 下架」、播出日寫星期、播放時間寫「15:00–16:30」，太長就截短）
 */
import { imageUrl } from '../../api/endpoints';
import { t } from '../../i18n/t';
import { isRecord } from '../../model/raw';
import { themeOf } from '../../model/theme';
import { imageNameOf, isImageSlot, type RevertScope, type RevertSide } from './revertScope';

export type RevertValue =
    | { kind: 'text'; text: string }
    | { kind: 'image'; slot: 'tile' | 'disc'; url: string | undefined }
    | { kind: 'theme'; colours: string[] };

/** 確認框 / 「已發佈：…」文字最多幾多字 */
const MAX_TEXT = 120;
const ELLIPSIS = '…';
const LIST_SEPARATOR = '、';
/** 配色色塊：底色、卡片、主色、標題、內文 */
const THEME_SWATCHES = ['bg', 'surface', 'accent', 'title', 'text'] as const;

const clip = (text: string) =>
    text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}${ELLIPSIS}` : text;

const listText = (field: string, items: readonly unknown[]): string => {
    const names = t('show.weekdays').split(',');
    return items
        .map((item) =>
            field === 'airDays' && typeof item === 'number'
                ? (names[item] ?? String(item))
                : typeof item === 'object'
                  ? JSON.stringify(item)
                  : String(item),
        )
        .join(LIST_SEPARATOR);
};

const objectText = (value: Record<string, unknown>): string =>
    typeof value.start === 'string' && typeof value.end === 'string'
        ? `${value.start}–${value.end}`
        : JSON.stringify(value);

/** 一個值嘅文字（冇 / 空 =「（未設定）」） */
export const valueText = (field: string, value: unknown): string => {
    if (value === undefined || value === null || value === '') return t('revert.empty');
    if (field === 'enabled' && typeof value === 'boolean')
        return t(value ? 'revert.listed' : 'revert.unlisted');
    if (Array.isArray(value))
        return value.length === 0 ? t('revert.empty') : clip(listText(field, value));
    if (isRecord(value)) return clip(objectText(value));
    return clip(String(value));
};

export const revertValueOf = (scope: RevertScope, side: RevertSide, field: string): RevertValue => {
    if (isImageSlot(field)) {
        const name = imageNameOf(scope, side, field);
        return { kind: 'image', slot: field, url: name === undefined ? undefined : imageUrl(name) };
    }
    if (field === 'theme' && isRecord(side.target.theme)) {
        const theme = themeOf(side.target);
        return { kind: 'theme', colours: THEME_SWATCHES.map((key) => theme[key]) };
    }
    return { kind: 'text', text: valueText(field, side.target[field]) };
};
