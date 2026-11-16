/*
 * PUT /api/branding/{icon,text} 嘅 body：形狀唔啱（唔係 object、少 key、多 key、型別錯）= 400；
 * 內容唔合格（底色、長度、空白）由 routes 回 422
 */
import { ICON_IMAGE_KEYS } from '@903-player/catalog';
import { isRecord, type Json } from '../content/http';
import { iconSourceOf } from './iconSource';
import type { BrandingIcon, BrandingText } from './store';

const ICON_STRING_KEYS: readonly string[] = [...ICON_IMAGE_KEYS, 'maskableBackground'];
/** source（原圖 + 裁切框）可以冇 / null：舊圖示照收 */
const ICON_KEYS: readonly string[] = [...ICON_STRING_KEYS, 'source'];
const TEXT_KEYS: readonly string[] = ['name', 'shortName', 'description'];

const onlyKeys = (body: Json, keys: readonly string[]) =>
    Object.keys(body).every((key) => keys.includes(key));

/** { favicon, appleTouch, icon192, icon512, maskable, maskableBackground } 全部係字串 + source? 形狀啱先回 */
export const iconBodyOf = (body: unknown): BrandingIcon | undefined => {
    if (!isRecord(body) || !onlyKeys(body, ICON_KEYS)) return undefined;
    if (!ICON_STRING_KEYS.every((key) => typeof body[key] === 'string')) return undefined;
    const source = iconSourceOf(body.source);
    if (source === undefined) return undefined;
    const icon = Object.fromEntries(ICON_STRING_KEYS.map((key) => [key, body[key]]));
    return { ...(icon as Omit<BrandingIcon, 'source'>), ...(source ? { source } : {}) };
};

const isOptionalString = (value: unknown) =>
    value === undefined || value === null || typeof value === 'string';

/** { name, shortName?, description }：trim；shortName 空 / null / 冇 = 唔設 */
export const textBodyOf = (body: unknown): BrandingText | undefined => {
    if (!isRecord(body) || !onlyKeys(body, TEXT_KEYS)) return undefined;
    const { name, shortName, description } = body;
    if (typeof name !== 'string' || typeof description !== 'string') return undefined;
    if (!isOptionalString(shortName)) return undefined;
    const short = typeof shortName === 'string' ? shortName.trim() : '';
    return {
        name: name.trim(),
        ...(short === '' ? {} : { shortName: short }),
        description: description.trim(),
    };
};
