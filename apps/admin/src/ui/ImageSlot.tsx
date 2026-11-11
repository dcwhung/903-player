/*
 * 圖片 slot：撳縮圖 → 揀檔（只收 WebP）→ 本機驗尺寸 → PUT /api/assets → onUploaded（caller 即刻 PUT entry：上載即存）
 * Design Origin: mockup: _mockups_/admin/index.html#s3（.img-slot、右下 ✎ / ＋）
 */
import { Pencil, Plus } from 'lucide-react';
import { useRef } from 'react';
import { t } from '../i18n/t';
import { sizeLabel, SLOT_SIZES, type ImageSlotKind } from './imageUpload';
import { useImageUpload } from './useImageUpload';

interface ImageSlotProps {
    slot: ImageSlotKind;
    url: string | undefined;
    onUploaded: (name: string) => Promise<void> | void;
}

export function ImageSlot({ slot, url, onUploaded }: ImageSlotProps) {
    const input = useRef<HTMLInputElement>(null);
    const { busy, error, onPick } = useImageUpload(slot, onUploaded);
    const slotName = t(`images.${slot}`);
    const action = t(url ? 'images.change' : 'images.upload', { slot: slotName });
    const classes = ['img-slot', slot === 'tile' ? 'tile' : '', url ? '' : 'empty'];
    return (
        <>
            <button
                type="button"
                className={classes.filter(Boolean).join(' ')}
                aria-label={action}
                title={`${action}：${t('images.tip', { slot: slotName, size: sizeLabel(SLOT_SIZES[slot]) })}`}
                aria-busy={busy}
                disabled={busy}
                onClick={() => input.current?.click()}
            >
                {url && (
                    <span
                        className={`thumb${slot === 'tile' ? ' tile' : ''}`}
                        style={{ backgroundImage: `url("${url}")` }}
                    />
                )}
                <span className="slot-btn" aria-hidden="true">
                    {url ? <Pencil /> : <Plus />}
                </span>
            </button>
            <input ref={input} type="file" accept="image/webp" hidden onChange={onPick} />
            <span className="cap">{busy ? t('images.uploading') : slotName}</span>
            {error && (
                <span className="err small" role="alert">
                    {error}
                </span>
            )}
        </>
    );
}
