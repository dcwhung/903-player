/*
 * 圖片 slot：撳縮圖（空 slot 撳 ＋）直接揀本機檔（PNG / JPG / WebP）→ 裁切 dialog → 「上載」→ PUT /api/assets →
 * onUploaded（caller 即刻 PUT entry：上載即存）。圖片下面（.slot-cap）只顯示名、R2 自動裁切狀態、錯誤；
 * 尺寸 / 格式 / 上限收埋喺 tooltip（讀屏照用 aria-describedby，S-817）
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#a（.img-slot、右下 ✎ / ＋、.pill info）+ #c（尺寸提示）
 */
import { Pencil, Plus } from 'lucide-react';
import { useId, useRef, useState } from 'react';
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

const LIMITS = { mb: SOURCE_MAX_MB, edge: SOURCE_MAX_EDGE_PX };
const limitsText = () => t('images.limits', LIMITS);

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
            <span className="sr-only" id={hintId}>
                {`${t('images.hint', { size: sizeLabel(SLOT_SIZES[slot]) })} ${limitsText()}`}
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

/** 上載流程 + 手動換咗圖之後收起嗰次自動裁切嘅狀態（「由 R2 … 自動裁切」唔再講真話，S-912） */
const useSlotUpload = (
    slot: ImageSlotKind,
    onUploaded: ImageSlotProps['onUploaded'],
    auto: AutoCropStatus | undefined,
) => {
    const [replaced, setReplaced] = useState<AutoCropStatus>();
    const upload = useImageUpload(slot, async (name) => {
        await onUploaded(name);
        setReplaced(auto);
    });
    return { upload, shownAuto: auto === replaced ? undefined : auto };
};

export function ImageSlot({ slot, url, preview, onUploaded, auto }: ImageSlotProps) {
    const input = useRef<HTMLInputElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const hintId = useId();
    const { upload, shownAuto } = useSlotUpload(slot, onUploaded, auto);
    const { phase } = upload.session;
    const busy = upload.busy !== null || auto?.status === 'loading';
    const slotName = t(`images.${slot}`);
    const action = t(url ? 'images.change' : 'images.upload', { slot: slotName });
    const classes = ['img-slot', slot === 'tile' ? 'tile' : '', url ? '' : 'empty'];
    const size = sizeLabel(SLOT_SIZES[slot]);
    const pickFile = () => input.current?.click();
    return (
        <div className="slot">
            <Tooltip text={t('images.tip', { slot: slotName, size, ...LIMITS })}>
                <button
                    ref={button}
                    type="button"
                    className={classes.filter(Boolean).join(' ')}
                    aria-label={action}
                    aria-describedby={hintId}
                    aria-busy={busy}
                    disabled={busy || phase !== null}
                    onClick={pickFile}
                >
                    <SlotFace slot={slot} url={url} />
                </button>
            </Tooltip>
            <ImageFileInput ref={input} onPick={upload.onPick} />
            <SlotCaption slot={slot} auto={shownAuto} hintId={hintId} />
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
                    returnFocus={button}
                />
            )}
        </div>
    );
}
