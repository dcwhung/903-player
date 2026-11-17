// @vitest-environment node
// 內建 Android maskable icon 要滿版（用戶 2026-11-17）：同 admin 0.9.1 自訂 maskable 一樣，原圖置中正方形裁切畫滿成張圖，
// 底色淨係喺原圖透明位後面見到；唔再縮入 80% 安全區。admin 卡上嘅內建預覽（assets/icon/icon-maskable-192.png）一樣。
import { readFileSync } from 'node:fs';
import { centerSquareCrop, ICON_BACKGROUND } from './iconLayout.mjs';
import { decodePng, type PngPixels } from './pngPixels.ts';

const read = (relative: string) => decodePng(readFileSync(new URL(relative, import.meta.url)));

const SOURCE = read('../../../design/app-icon.png');
const BUILT_IN_MASKABLE = {
    'player public/icon-maskable-512.png': '../public/icon-maskable-512.png',
    'admin assets/icon/icon-maskable-192.png': '../../admin/src/assets/icon/icon-maskable-192.png',
};

const hex = ([r, g, b]: number[]) =>
    `#${[r, g, b].map((channel) => (channel ?? 0).toString(16).padStart(2, '0')).join('')}`;

const BACKGROUND_RGB = [1, 3, 5].map((at) =>
    Number.parseInt(ICON_BACKGROUND.slice(at, at + 2), 16),
);

/** 每個 channel 差幾多都算同一隻色（縮放 / smoothing 誤差） */
const CHANNEL_TOLERANCE = 12;

const closeTo = (actual: number[], expected: number[]) =>
    expected.every(
        (channel, index) => Math.abs((actual[index] ?? 0) - channel) <= CHANNEL_TOLERANCE,
    );

/** 輸出 (x, y) 對返原圖嘅像素（admin drawIcon：裁切框拉滿成張 canvas） */
const sourcePixelFor = (icon: PngPixels, x: number, y: number) => {
    const crop = centerSquareCrop({ width: SOURCE.width, height: SOURCE.height });
    const scale = crop.width / icon.width;
    return SOURCE.pixel(
        Math.floor(crop.x + (x + 0.5) * scale),
        Math.floor(crop.y + (y + 0.5) * scale),
    );
};

describe('centerSquareCrop', () => {
    it('should match the admin default icon crop (largest centred square) when the source is not square', () => {
        // admin cropGeometry.centerCrop(502×499, 512×512)：內建原圖嘅預設框
        expect(centerSquareCrop({ width: 502, height: 499 })).toEqual({
            x: 2,
            y: 0,
            width: 499,
            height: 499,
        });
    });

    it('should crop the middle of a tall source', () => {
        expect(centerSquareCrop({ width: 100, height: 141 })).toEqual({
            x: 0,
            y: 21,
            width: 100,
            height: 100,
        });
    });
});

/**
 * 邊位取樣點（邊長比例）：滿版時係深色耳筒 / 紅色指針，舊版縮入 80% 安全區時呢啲位係淨底色（S-1102）。
 * 原圖色同底色每個 channel 都差超過 2 × CHANNEL_TOLERANCE，所以縮細咗嘅舊圖一定對唔上原圖
 */
const EDGE_SAMPLES = {
    'red pointer near the top edge': [0.71, 0.1],
    'left earcup near the bottom edge': [0.28, 0.94],
    'right earcup near the bottom edge': [0.72, 0.94],
} as const;

const differsFromBackground = (pixel: number[]) =>
    BACKGROUND_RGB.every(
        (channel, index) => Math.abs((pixel[index] ?? 0) - channel) > 2 * CHANNEL_TOLERANCE,
    );

describe.each(Object.entries(BUILT_IN_MASKABLE))('built-in maskable icon (%s)', (_, path) => {
    const icon = read(path);

    it.each(Object.entries(EDGE_SAMPLES))(
        'should show the source art full-bleed at the %s',
        (_label, [fx, fy]) => {
            const x = Math.floor(fx * icon.width);
            const y = Math.floor(fy * icon.height);
            const expected = sourcePixelFor(icon, x, y);
            // 取樣點要分得開底色，否則舊（縮細）圖都會 pass
            expect(differsFromBackground(expected)).toBe(true);
            expect(closeTo(icon.pixel(x, y), expected)).toBe(true);
        },
    );

    it('should fill the transparent source corners with the background', () => {
        expect(hex(icon.pixel(0, 0))).toBe(ICON_BACKGROUND);
        expect(icon.pixel(0, 0)[3]).toBe(255);
    });
});
