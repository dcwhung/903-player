/*
 * 圖片 slot：撳縮圖 → 揀檔（PNG / JPG / WebP）→ 置中裁切 + 轉 WebP → 預覽 dialog → 「上載」→ PUT /api/assets →
 * onUploaded（caller 即刻 PUT entry：上載即存）。名、尺寸提示、錯誤都放喺各自圖片下面（.slot-cap）
 * Design Origin: mockup: _mockups_/admin/index.html#s3（.img-slot、右下 ✎ / ＋）+ admin-style ⑤ / ⑥
 */
import { Pencil, Plus } from 'lucide-react';
import { useRef } from 'react';
import { t } from '../i18n/t';
import { sizeLabel, SLOT_SIZES, type ImageSlotKind } from './imageUpload';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { Tooltip } from './Tooltip';
import { useImageUpload } from './useImageUpload';

const ACCEPT = 'image/png,image/jpeg,image/webp';

interface ImageSlotProps {
    slot: ImageSlotKind;
    url: string | undefined;
    onUploaded: (name: string) => Promise<void> | void;
}

/** 縮圖 + 右下 ✎ / ＋ */
function SlotFace({ slot, url }: { slot: ImageSlotKind; url: string | undefined }) {
    return (
        <>
            {url && (
                <span
                    className={`thumb${slot === 'tile' ? ' tile' : ''}`}
                    style={{ backgroundImage: `url("${url}")` }}
                />
            )}
            <span className="slot-btn" aria-hidden="true">
                {url ? <Pencil /> : <Plus />}
            </span>
        </>
    );
}

export function ImageSlot({ slot, url, onUploaded }: ImageSlotProps) {
    const input = useRef<HTMLInputElement>(null);
    const { busy, error, pending, onPick, confirm, cancel } = useImageUpload(slot, onUploaded);
    const slotName = t(`images.${slot}`);
    const action = t(url ? 'images.change' : 'images.upload', { slot: slotName });
    const classes = ['img-slot', slot === 'tile' ? 'tile' : '', url ? '' : 'empty'];
    const size = sizeLabel(SLOT_SIZES[slot]);
    return (
        <div className="slot">
            <Tooltip text={t('images.tip', { slot: slotName, size })}>
                <button
                    type="button"
                    className={classes.filter(Boolean).join(' ')}
                    aria-label={action}
                    aria-busy={busy}
                    disabled={busy || pending !== null}
                    onClick={() => input.current?.click()}
                >
                    <SlotFace slot={slot} url={url} />
                </button>
            </Tooltip>
            <input
                ref={input}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => void onPick(e)}
            />
            <span className="slot-cap">
                <span className="cap">{busy ? t('images.uploading') : slotName}</span>
                <span className="hint">{t('images.hint', { size })}</span>
                {error && (
                    <span className="err small" role="alert">
                        {error}
                    </span>
                )}
            </span>
            {pending && (
                <ImagePreviewDialog
                    slot={slot}
                    image={pending}
                    busy={busy}
                    onConfirm={() => void confirm()}
                    onCancel={cancel}
                />
            )}
        </div>
    );
}
