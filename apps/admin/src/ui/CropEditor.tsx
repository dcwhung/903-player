/*
 * 裁切 dialog 主體（原圖已載入）：左 = 原圖 + 裁切框 + 放大警告 + 候選；右 = 播放器預覽
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#b（.editor）+ #c（原圖細過輸出：黃色警告）
 */
import { TriangleAlert, Upload } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n/t';
import { CropCandidates } from './CropCandidates';
import { cropSourceSize, upscaleFactor } from './cropGeometry';
import { CropPlayerPreview, type CropPreviewInfo } from './CropPlayerPreview';
import type { CropChoice } from './cropRender';
import { CropSourcePane } from './CropSourcePane';
import { SLOT_SIZES, sizeLabel, type CropSlot } from './imageUpload';
import type { ReadySource } from './useCropSession';

const SLOT_NAMES: Record<CropSlot, Parameters<typeof t>[0]> = {
    disc: 'images.disc',
    tile: 'images.tile',
    bannerStandard: 'images.bannerStandard',
    bannerLong: 'images.bannerLong',
};

export const slotName = (slot: CropSlot) => t(SLOT_NAMES[slot]);

function UpscaleWarning({ ready, slot }: { ready: ReadySource; slot: CropSlot }) {
    const target = SLOT_SIZES[slot];
    const { mode, box } = ready.choice;
    const factor = upscaleFactor(mode, box, ready.loaded.source, target);
    if (factor <= 1) return null;
    const { size, cropped } = cropSourceSize(mode, box, ready.loaded.source);
    const params = {
        source: sizeLabel(size),
        slot: slotName(slot),
        target: sizeLabel(target),
        factor,
    };
    return (
        <p className="note warn">
            <TriangleAlert aria-hidden="true" />
            <span>{t(cropped ? 'images.upscaleCrop' : 'images.upscale', params)}</span>
        </p>
    );
}

interface CropEditorProps {
    ready: ReadySource;
    slot: CropSlot;
    info: CropPreviewInfo;
    disabled: boolean;
    onChoice: (choice: CropChoice) => void;
    onPickOther: () => void;
}

export function CropEditor({
    ready,
    slot,
    info,
    disabled,
    onChoice,
    onPickOther,
}: CropEditorProps) {
    const [dragging, setDragging] = useState(false);
    return (
        <div className="editor">
            <div className="pane">
                <span className="label">
                    {t('images.previewSource')}{' '}
                    <span className="small muted">{t('images.sourceHint')}</span>
                </span>
                <CropSourcePane
                    ready={ready}
                    slot={slot}
                    disabled={disabled}
                    onChoice={onChoice}
                    onDragChange={setDragging}
                />
                <UpscaleWarning ready={ready} slot={slot} />
                <CropCandidates
                    ready={ready}
                    slot={slot}
                    disabled={disabled}
                    dragging={dragging}
                    onChoice={onChoice}
                />
                <button
                    type="button"
                    className="link-btn pick-other"
                    onClick={onPickOther}
                    disabled={disabled}
                >
                    <Upload aria-hidden="true" />
                    {t('images.pickOther')}
                </button>
            </div>
            <CropPlayerPreview ready={ready} slot={slot} info={info} />
        </div>
    );
}
