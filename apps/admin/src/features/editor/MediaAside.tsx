/* 編輯卡右邊圖片欄：Banner 排先、碟面排後（mockup admin-style ⑤ .media，340×192 / 192px） */
import type { ImageMap, RawDefinition } from '../../api/types';
import { imageOf } from '../../model/raw';
import { ImageSlot } from '../../ui/ImageSlot';
import type { ImageSlotKind } from '../../ui/imageUpload';

interface MediaAsideProps {
    /** 劇集 / 節目 definition，或者短篇（arc） */
    target: RawDefinition;
    images: ImageMap;
    onUploaded: (slot: ImageSlotKind, name: string) => Promise<void>;
    id?: string;
}

export function MediaAside({ target, images, onUploaded, id }: MediaAsideProps) {
    return (
        <aside className="media" id={id}>
            {(['tile', 'disc'] as const).map((slot) => (
                <ImageSlot
                    key={slot}
                    slot={slot}
                    url={imageOf(target, images, slot)}
                    onUploaded={(name) => onUploaded(slot, name)}
                />
            ))}
        </aside>
    );
}
