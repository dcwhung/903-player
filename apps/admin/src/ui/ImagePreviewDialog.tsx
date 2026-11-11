/*
 * 上載前預覽（3c）：Design Origin: mockup: _mockups_/admin-style/index.html#f（⑥）
 * 「原圖」（保留範圍框）同「裁切後」（碟面圓形、Banner 長方）兩格並排、各自有邊框，
 * 說明放喺各自圖下面（原圖：檔名、尺寸 · 格式；裁切後：輸出尺寸 · WebP · 約 KB）；撳「上載」先寫入。
 * 開啟時 focus 入「取消」、Tab 喺兩粒掣之間循環、Esc 取消（同 ConfirmDialog）
 */
import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { t } from '../i18n/t';
import { cropBoxStyle, type PreparedImage } from './imageCrop';
import { sizeLabel, type ImageSlotKind } from './imageUpload';
import { useDialogFocus } from './useDialogFocus';

export interface PendingImage extends PreparedImage {
    name: string;
    /** 原檔 MIME type（image/jpeg …）；冇就唔顯示格式 */
    type?: string;
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

const BYTES_PER_KB = 1024;

/** image/jpeg → JPEG、image/webp → WebP；唔識就冇 */
const FORMAT_NAMES: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
};

const sourceMeta = (image: PendingImage) => {
    const size = sizeLabel(image.source);
    const format = FORMAT_NAMES[image.type ?? ''];
    return format ? t('images.previewSourceMeta', { size, format }) : size;
};

const resultMeta = (image: PendingImage) =>
    t('images.previewResultMeta', {
        size: sizeLabel(image.target),
        kb: Math.max(1, Math.round(image.blob.size / BYTES_PER_KB)),
    });

/** 一格：有邊框嘅圖 + 下面標題同說明 */
function Pane({ title, lines, children }: { title: string; lines: string[]; children: ReactNode }) {
    const titleId = useId();
    return (
        <figure className="pane" aria-labelledby={titleId}>
            <div className="frame">{children}</div>
            <figcaption>
                <strong id={titleId}>{title}</strong>
                {lines.map((line) => (
                    <span key={line}>{line}</span>
                ))}
            </figcaption>
        </figure>
    );
}

/** 原圖（保留範圍框）| 裁切後 */
function CropPreview({ slot, image }: { slot: ImageSlotKind; image: PendingImage }) {
    return (
        <div className="crop">
            <Pane title={t('images.previewSource')} lines={[image.name, sourceMeta(image)]}>
                <div className="src">
                    <img src={image.sourceUrl} alt={t('images.previewSourceAlt')} />
                    {image.crop && (
                        <span className="box" style={cropBoxStyle(image.source, image.crop)} />
                    )}
                </div>
            </Pane>
            <Pane
                title={t('images.previewResult')}
                lines={[
                    resultMeta(image),
                    t(image.crop ? 'images.previewCropped' : 'images.previewExact'),
                ]}
            >
                <img
                    className={`out ${slot}`}
                    src={image.resultUrl}
                    alt={t('images.previewResultAlt')}
                />
            </Pane>
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
