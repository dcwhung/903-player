/*
 * 一個裁切候選嘅縮細版（候選掣、播放器預覽）：按輸出比例、最闊 PREVIEW_MAX_PX 畫落 canvas。
 * 拖緊裁切框時每格（requestAnimationFrame）最多畫一次，而且只跟真正有影響嘅值：
 * 置中裁切跟框嘅座標；fit 兩款成張圖放入去，同框無關，框郁都唔重畫（S-910）
 */
import { useEffect, useRef } from 'react';
import { CROP_MODE, type CropRect } from './cropGeometry';
import { drawChoice, type CropChoice } from './cropRender';
import type { LoadedSource } from './imageCrop';
import { browserEnv } from './imageCrop';
import type { Size } from './imageUpload';

/** 預覽 canvas 最闊幾多 px（輸出 2000 闊嘅首頁 Banner 闊版都縮到呢個數，拖框先夠快） */
const PREVIEW_MAX_PX = 480;
/** fit 兩款唔用框：固定一個，唔會因為框郁而重畫 */
const UNUSED_BOX: CropRect = { x: 0, y: 0, width: 0, height: 0 };

interface ChoiceCanvasProps {
    loaded: LoadedSource;
    choice: CropChoice;
    target: Size;
}

export function ChoiceCanvas({ loaded, choice, target }: ChoiceCanvasProps) {
    const ref = useRef<HTMLCanvasElement>(null);
    const scale = Math.min(1, PREVIEW_MAX_PX / target.width);
    const width = Math.round(target.width * scale);
    const height = Math.round(target.height * scale);
    const { mode } = choice;
    const box = mode === CROP_MODE.CENTER ? choice.box : UNUSED_BOX;
    const { x, y, width: boxWidth, height: boxHeight } = box;
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const canvas = ref.current;
            const drawn = { mode, box: { x, y, width: boxWidth, height: boxHeight } };
            if (canvas) drawChoice(canvas, loaded, drawn, browserEnv.createCanvas);
        });
        return () => cancelAnimationFrame(frame);
    }, [loaded, mode, x, y, boxWidth, boxHeight, width, height]);
    return <canvas ref={ref} width={width} height={height} aria-hidden="true" />;
}
