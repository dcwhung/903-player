/*
 * 一個裁切後嘅 App 圖示縮圖（預覽用）：按 box 畫落 size × size canvas；maskable 時先填遮罩底色（同上載 PNG 一樣畫滿，唔縮入安全區）。
 * 拖緊框時最多每格（rAF）畫一次（同 ChoiceCanvas 做法）
 */
import { useEffect, useRef } from 'react';
import { browserEnv } from '../../ui/imageCrop';
import type { CropRect } from '../../ui/cropGeometry';
import type { LoadedSource } from '../../ui/imageCrop';
import { drawIcon } from './iconRender';

/** 預覽 canvas 邊長（px）：夠清又唔使畫足 512 */
const PREVIEW_PX = 128;

interface IconCanvasProps {
    loaded: LoadedSource;
    box: CropRect;
    /** maskable：先填底色（透明位見到）；null = 唔填底色。兩款圖都畫滿成個 canvas */
    background: string | null;
}

export function IconCanvas({ loaded, box, background }: IconCanvasProps) {
    const ref = useRef<HTMLCanvasElement>(null);
    const { x, y, width, height } = box;
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const canvas = ref.current;
            if (canvas) drawIcon(canvas, loaded.image, { x, y, width, height }, background);
        });
        return () => cancelAnimationFrame(frame);
    }, [loaded, x, y, width, height, background]);
    return <canvas ref={ref} width={PREVIEW_PX} height={PREVIEW_PX} aria-hidden="true" />;
}

export { browserEnv };
