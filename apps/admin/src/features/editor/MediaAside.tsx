/*
 * 編輯卡右邊圖片欄：Banner 排先、碟面排後（mockup admin-style ⑤ .media，340×192 / 192px）；
 * auto = R2 原圖自動裁切狀態（劇集 / 短篇，見 useR2AutoCrop）
 */
import type { ImageMap, RawDefinition } from '../../api/types';
import { imageOf } from '../../model/raw';
import type { CropPreviewInfo } from '../../ui/CropPlayerPreview';
import { ImageSlot, type AutoCropStatus } from '../../ui/ImageSlot';
import type { ImageSlotKind } from '../../ui/imageUpload';

interface MediaAsideProps {
    /** 劇集 / 節目 definition，或者短篇（arc） */
    target: RawDefinition;
    images: ImageMap;
    /** 裁切 dialog 播放器預覽用嘅名同配色 */
    preview: CropPreviewInfo;
    onUploaded: (slot: ImageSlotKind, name: string) => Promise<void>;
    auto?: Partial<Record<ImageSlotKind, AutoCropStatus>> | undefined;
    id?: string;
}

export function MediaAside({ target, images, preview, onUploaded, auto, id }: MediaAsideProps) {
    return (
        <aside className="media" id={id}>
            {(['tile', 'disc'] as const).map((slot) => (
                <ImageSlot
                    key={slot}
                    slot={slot}
                    url={imageOf(target, images, slot)}
                    preview={preview}
                    auto={auto?.[slot]}
                    onUploaded={(name) => onUploaded(slot, name)}
                />
            ))}
        </aside>
    );
}
