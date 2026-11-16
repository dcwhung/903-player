/*
 * 圖片 slot：撳縮圖（空 slot 撳 ＋）直接揀本機檔（PNG / JPG / WebP）→ 裁切 dialog → 「上載」→ PUT /api/assets →
 * onUploaded（caller 即刻 PUT entry：上載即存）。圖片下面（.slot-cap）只顯示名、R2 自動裁切狀態、錯誤；
 * 尺寸 / 格式 / 上限收埋喺 tooltip（讀屏照用 aria-describedby，S-817）
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#a（.img-slot、右下 ✎ / ＋、.pill info）+ #c（尺寸提示）
 */
import { Pencil, Plus } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n/t';
import type { CropPreviewInfo } from './CropPlayerPreview';
import { ImageFileInput } from './ImageFileInput';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { SlotCaption, type AutoCropStatus } from './SlotCaption';
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

export type { AutoCropStatus } from './SlotCaption';

interface ImageSlotProps {
    slot: ImageSlotKind;
    url: string | undefined;
    preview: CropPreviewInfo;
    onUploaded: (name: string) => Promise<void> | void;
    auto?: AutoCropStatus | undefined;
    /** 已儲存嘅圖同已發佈唔同：名旁「已修改」 */
    modified?: boolean;
    /** 鉛筆旁嘅圓形還原掣（mockup admin-revert ③） */
    revert?: ReactNode;
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

/** 掣嘅 aria-label（更換 / 上載）、class、輸出尺寸 */
const slotLabels = (slot: ImageSlotKind, url: string | undefined) => {
    const action = t(url ? 'images.change' : 'images.upload', { slot: t(`images.${slot}`) });
    const classes = ['img-slot', slot === 'tile' ? 'tile' : '', url ? '' : 'empty'];
    return {
        action,
        className: classes.filter(Boolean).join(' '),
        size: sizeLabel(SLOT_SIZES[slot]),
    };
};

export function ImageSlot(props: ImageSlotProps) {
    const { slot, url, preview, onUploaded, auto, modified = false, revert } = props;
    const input = useRef<HTMLInputElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const hintId = useId();
    const { upload, shownAuto } = useSlotUpload(slot, onUploaded, auto);
    const { phase } = upload.session;
    const busy = upload.busy !== null || auto?.status === 'loading';
    const { action, className, size } = slotLabels(slot, url);
    const pickFile = () => input.current?.click();
    return (
        <div className="slot">
            <div className="slot-face">
                <Tooltip text={t('images.tip', { size, ...LIMITS })}>
                    <button
                        ref={button}
                        type="button"
                        className={className}
                        aria-label={action}
                        aria-describedby={hintId}
                        aria-busy={busy}
                        disabled={busy || phase !== null}
                        onClick={pickFile}
                    >
                        <SlotFace slot={slot} url={url} />
                    </button>
                </Tooltip>
                {revert}
            </div>
            <ImageFileInput ref={input} onPick={upload.onPick} />
            <SlotCaption slot={slot} auto={shownAuto} hintId={hintId} modified={modified} />
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
