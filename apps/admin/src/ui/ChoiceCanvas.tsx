/*
 * 一個裁切候選嘅縮細版（候選掣、播放器預覽）：按輸出比例、最闊 PREVIEW_MAX_PX 畫落 canvas；
 * 拖緊裁切框時跟住 choice 即刻重畫
 */
import { useEffect, useRef } from 'react';
import { drawChoice, type CropChoice } from './cropRender';
import type { LoadedSource } from './imageCrop';
import { browserEnv } from './imageCrop';
import type { Size } from './imageUpload';

/** 預覽 canvas 最闊幾多 px（輸出 2000 闊嘅闊版 Banner 都縮到呢個數，拖框先夠快） */
const PREVIEW_MAX_PX = 480;

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
    useEffect(() => {
        const canvas = ref.current;
        if (canvas) drawChoice(canvas, loaded, choice, browserEnv.createCanvas);
    }, [loaded, choice, width, height]);
    return <canvas ref={ref} width={width} height={height} aria-hidden="true" />;
}
