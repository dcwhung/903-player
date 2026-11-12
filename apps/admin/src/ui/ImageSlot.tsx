/*
 * 圖片 slot：撳縮圖（空 slot 撳 ＋）直接揀本機檔（PNG / JPG / WebP）→ 裁切 dialog → 「上載」→ PUT /api/assets →
 * onUploaded（caller 即刻 PUT entry：上載即存）。名、R2 自動裁切狀態、尺寸提示（aria-describedby，S-817）、
 * 錯誤都放喺各自圖片下面（.slot-cap）
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#a（.img-slot、右下 ✎ / ＋、.pill info）+ #c（尺寸提示）
 */
import { Pencil, Plus } from 'lucide-react';
import { useId, useRef } from 'react';
import { t } from '../i18n/t';
import type { CropPreviewInfo } from './CropPlayerPreview';
import { ImageFileInput } from './ImageFileInput';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import {
    sizeLabel,
    SLOT_SIZES,
    SOURCE_MAX_EDGE_PX,
    SOURCE_MAX_MB,
    type ImageSlotKind,
} from './imageUpload';
import { Tooltip } from './Tooltip';
import { useImageUpload } from './useImageUpload';

/** R2 原圖自動裁切嘅狀態（只喺今次 session 顯示） */
export type AutoCropStatus =
    { status: 'loading' } | { status: 'done'; file: string } | { status: 'error'; message: string };

interface ImageSlotProps {
    slot: ImageSlotKind;
    url: string | undefined;
    preview: CropPreviewInfo;
    onUploaded: (name: string) => Promise<void> | void;
    auto?: AutoCropStatus | undefined;
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

function SlotCaption({
    slot,
    auto,
    hintId,
}: {
    slot: ImageSlotKind;
    auto: AutoCropStatus | undefined;
    hintId: string;
}) {
    return (
        <span className="slot-cap">
            <span className="cap">
                {auto?.status === 'loading' ? t('images.autoLoading') : t(`images.${slot}`)}
            </span>
            <AutoNote auto={auto} />
            <span className="hint" id={`${hintId}-size`}>
                {t('images.hint', { size: sizeLabel(SLOT_SIZES[slot]) })}
            </span>
            <span className="hint" id={`${hintId}-limits`}>
                {t('images.limits', { mb: SOURCE_MAX_MB, edge: SOURCE_MAX_EDGE_PX })}
            </span>
        </span>
    );
}

function AutoNote({ auto }: { auto: AutoCropStatus | undefined }) {
    if (auto?.status === 'done')
        return <span className="pill info">{t('images.autoCropped', { file: auto.file })}</span>;
    if (auto?.status !== 'error') return null;
    return (
        <span className="err small" role="alert">
            {t('images.autoFailed', { error: auto.message })}
        </span>
    );
}

export function ImageSlot({ slot, url, preview, onUploaded, auto }: ImageSlotProps) {
    const input = useRef<HTMLInputElement>(null);
    const hintId = useId();
    const upload = useImageUpload(slot, onUploaded);
    const { phase } = upload.session;
    const busy = upload.busy !== null || auto?.status === 'loading';
    const slotName = t(`images.${slot}`);
    const action = t(url ? 'images.change' : 'images.upload', { slot: slotName });
    const classes = ['img-slot', slot === 'tile' ? 'tile' : '', url ? '' : 'empty'];
    const size = sizeLabel(SLOT_SIZES[slot]);
    const pickFile = () => input.current?.click();
    return (
        <div className="slot">
            <Tooltip text={t('images.tip', { slot: slotName, size })}>
                <button
                    type="button"
                    className={classes.filter(Boolean).join(' ')}
                    aria-label={action}
                    aria-describedby={`${hintId}-size ${hintId}-limits`}
                    aria-busy={busy}
                    disabled={busy || phase !== null}
                    onClick={pickFile}
                >
                    <SlotFace slot={slot} url={url} />
                </button>
            </Tooltip>
            <ImageFileInput ref={input} onPick={upload.onPick} />
            <SlotCaption slot={slot} auto={auto} hintId={hintId} />
            {phase && (
                <ImagePreviewDialog
                    slot={slot}
                    title={t('images.dialogTitle', { action, size })}
                    phase={phase}
                    info={preview}
                    busy={upload.busy}
                    error={upload.error}
                    onChoice={upload.session.choose}
                    onConfirm={() => void upload.confirm()}
                    onCancel={upload.cancel}
                    onPickOther={pickFile}
                />
            )}
        </div>
    );
}
