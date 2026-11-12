/* 隱藏嘅揀檔 input（PNG / JPG / WebP）：圖片 slot、首頁 Banner 頁撳掣時 .click() 佢 */
import type { ChangeEvent, Ref } from 'react';
import { ACCEPTED_TYPES } from './imageCrop';

interface ImageFileInputProps {
    ref: Ref<HTMLInputElement>;
    onPick: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ImageFileInput({ ref, onPick }: ImageFileInputProps) {
    return (
        <input ref={ref} type="file" accept={ACCEPTED_TYPES.join(',')} hidden onChange={onPick} />
    );
}
