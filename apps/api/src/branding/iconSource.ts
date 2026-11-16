/*
 * App 圖示原圖 + 裁切框（icon recrop，migration 0007）：PUT /api/branding/icon 可以帶 source，
 * admin 撳預覽重新裁切時由原圖 + 上次嘅框開始，唔會越裁越差。
 * 形狀唔啱 = 400（iconSourceOf 回 undefined）；內容唔合格（框出界、原圖未上載）= 422（iconSourceProblem）
 */
import {
    CATALOG_IMAGE_KEY_PREFIX,
    ICON_SOURCE_FILE_PATTERN,
    ICON_SOURCE_MAX_EDGE_PX,
} from '../config';
import { hasAsset } from '../catalog/store';
import { isRecord } from '../content/http';
import { hashOfImageName } from '../assets/imageName';

export const ICON_CROP_DEVICES = ['ios', 'android', 'tab'] as const;
export type IconCropDevice = (typeof ICON_CROP_DEVICES)[number];

/** 原圖像素 */
export interface IconCropBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface IconSource {
    /** R2 原圖檔名 <hash>.<png|jpg|webp> */
    image: string;
    /** 「所有裝置使用同一裁切」 */
    same: boolean;
    boxes: Record<IconCropDevice, IconCropBox>;
}

const SOURCE_KEYS = ['image', 'same', 'boxes'] as const;
const BOX_KEYS = ['x', 'y', 'width', 'height'] as const;

const hasExactly = (value: Record<string, unknown>, keys: readonly string[]) =>
    Object.keys(value).length === keys.length && keys.every((key) => key in value);

const isBox = (value: unknown): value is IconCropBox =>
    isRecord(value) &&
    hasExactly(value, BOX_KEYS) &&
    BOX_KEYS.every((key) => typeof value[key] === 'number');

const areBoxes = (value: unknown): value is IconSource['boxes'] =>
    isRecord(value) &&
    hasExactly(value, ICON_CROP_DEVICES) &&
    ICON_CROP_DEVICES.every((device) => isBox(value[device]));

/** null / 冇 = 冇原圖（舊圖示照收）；形狀唔啱 = undefined（400） */
export const iconSourceOf = (value: unknown): IconSource | null | undefined => {
    if (value === undefined || value === null) return null;
    if (!isRecord(value) || !hasExactly(value, SOURCE_KEYS)) return undefined;
    const { image, same, boxes } = value;
    if (typeof image !== 'string' || typeof same !== 'boolean' || !areBoxes(boxes))
        return undefined;
    return {
        image,
        same,
        boxes: Object.fromEntries(
            ICON_CROP_DEVICES.map((device) => {
                const { x, y, width, height } = boxes[device];
                return [device, { x, y, width, height }];
            }),
        ) as IconSource['boxes'],
    };
};

const boxProblem = ({ x, y, width, height }: IconCropBox): string | undefined => {
    if (![x, y, width, height].every(Number.isFinite)) return 'must be finite numbers';
    if (x < 0 || y < 0) return 'must not start before 0';
    if (width <= 0 || height <= 0) return 'must not be empty';
    if (x + width > ICON_SOURCE_MAX_EDGE_PX || y + height > ICON_SOURCE_MAX_EDGE_PX)
        return `must stay within ${ICON_SOURCE_MAX_EDGE_PX} px`;
    return undefined;
};

/** 一個問題（冇 = undefined）：框先（唔使讀 D1 / R2），再驗原圖已上載 */
export const iconSourceProblem = async (
    env: { DB: D1Database; CATALOG: R2Bucket },
    source: IconSource,
): Promise<string | undefined> => {
    for (const device of ICON_CROP_DEVICES) {
        const problem = boxProblem(source.boxes[device]);
        if (problem) return `source.boxes.${device} ${problem}`;
    }
    const { image } = source;
    if (!ICON_SOURCE_FILE_PATTERN.test(image))
        return `source.image: ${image} is not <hash>.<png|jpg|webp>`;
    const uploaded =
        (await hasAsset(env.DB, hashOfImageName(image))) &&
        (await env.CATALOG.head(`${CATALOG_IMAGE_KEY_PREFIX}${image}`)) !== null;
    return uploaded ? undefined : `source.image: ${image} not uploaded`;
};
