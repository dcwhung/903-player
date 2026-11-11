/*
 * 上載前預覽（3c）：Design Origin: mockup: _mockups_/admin-style/index.html#f（⑥）
 * 原圖 + 保留範圍框 → 裁切後預覽（碟面圓形、Banner 長方）+ 「檔名 · 原尺寸 → 標準尺寸 WebP」；撳「上載」先寫入。
 * 開啟時 focus 入「取消」、Tab 喺兩粒掣之間循環、Esc 取消（同 ConfirmDialog）
 */
import { ArrowRight, Check } from 'lucide-react';
import { useId } from 'react';
import { t } from '../i18n/t';
import { cropBoxStyle, type PreparedImage } from './imageCrop';
import { sizeLabel, type ImageSlotKind } from './imageUpload';
import { useDialogFocus } from './useDialogFocus';

export interface PendingImage extends PreparedImage {
    name: string;
    sourceUrl: string;
    resultUrl: string;
}

interface ImagePreviewDialogProps {
    slot: ImageSlotKind;
    image: PendingImage;
    busy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const metaOf = (image: PendingImage) =>
    image.crop
        ? t('images.previewCropped', {
              name: image.name,
              from: sizeLabel(image.source),
              to: sizeLabel(image.target),
          })
        : t('images.previewExact', { name: image.name, to: sizeLabel(image.target) });

/** 原圖（保留範圍框）→ 裁切後 */
function CropPreview({ slot, image }: { slot: ImageSlotKind; image: PendingImage }) {
    return (
        <div className="crop">
            <div className="src">
                <img src={image.sourceUrl} alt={t('images.previewSource')} />
                {image.crop && (
                    <span className="box" style={cropBoxStyle(image.source, image.crop)} />
                )}
            </div>
            <ArrowRight aria-hidden="true" />
            <img className={`out ${slot}`} src={image.resultUrl} alt={t('images.previewResult')} />
        </div>
    );
}

export function ImagePreviewDialog({
    slot,
    image,
    busy,
    onConfirm,
    onCancel,
}: ImagePreviewDialogProps) {
    const titleId = useId();
    const { cancelRef, confirmRef, onKeyDown } = useDialogFocus(onCancel);
    return (
        <div className="scrim" onKeyDown={onKeyDown}>
            <div
                className="card crop-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <h3 id={titleId}>{t('images.previewTitle', { slot: t(`images.${slot}`) })}</h3>
                <CropPreview slot={slot} image={image} />
                <p className="meta">{metaOf(image)}</p>
                <div className="actions end">
                    <button type="button" ref={cancelRef} onClick={onCancel} disabled={busy}>
                        {t('images.cancel')}
                    </button>
                    <button
                        type="button"
                        ref={confirmRef}
                        className="primary"
                        onClick={onConfirm}
                        disabled={busy}
                        aria-busy={busy}
                    >
                        <Check aria-hidden="true" />
                        {busy ? t('images.uploading') : t('images.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
