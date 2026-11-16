/*
 * PUT /api/branding/{icon,text} 嘅 body：形狀唔啱（唔係 object、少 key、多 key、型別錯）= 400；
 * 內容唔合格（底色、長度、空白）由 routes 回 422
 */
import { ICON_IMAGE_KEYS } from '@903-player/catalog';
import { isRecord, type Json } from '../content/http';
import type { BrandingIcon, BrandingText } from './store';

const ICON_KEYS: readonly string[] = [...ICON_IMAGE_KEYS, 'maskableBackground'];
const TEXT_KEYS: readonly string[] = ['name', 'shortName', 'description'];

const onlyKeys = (body: Json, keys: readonly string[]) =>
    Object.keys(body).every((key) => keys.includes(key));

/** { favicon, appleTouch, icon192, icon512, maskable, maskableBackground } 全部係字串先回 */
export const iconBodyOf = (body: unknown): BrandingIcon | undefined => {
    if (!isRecord(body) || !onlyKeys(body, ICON_KEYS)) return undefined;
    if (!ICON_KEYS.every((key) => typeof body[key] === 'string')) return undefined;
    return body as BrandingIcon;
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
