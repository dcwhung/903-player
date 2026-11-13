/*
 * 裁切 dialog 右邊：用 player 樣式即場預覽（碟面：圓碟 + 碟邊 + 碟心；橫圖（tile）：圓角卡 + 名；
 * 首頁 Banner：長方），下面寫輸出尺寸同裁切範圍
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#b（.pv / .pdisc / .ptile / .pbanner / .meta）
 */
import { t } from '../i18n/t';
import { themeStyle, type EntryTheme } from '../model/theme';
import { ChoiceCanvas } from './ChoiceCanvas';
import { CROP_MODE } from './cropGeometry';
import { SLOT_SIZES, sizeLabel, type CropSlot } from './imageUpload';
import type { ReadySource } from './useCropSession';

/** 預覽用嘅節目 / 劇集資料（tile 卡下面嘅名、碟邊 / 底色） */
export interface CropPreviewInfo {
    name: string;
    theme: EntryTheme;
}

const PREVIEW_CLASS: Record<CropSlot, string> = {
    disc: 'pdisc',
    tile: 'ptile',
    bannerStandard: 'pbanner',
    bannerLong: 'pbanner',
};

const choiceNote = (ready: ReadySource) => {
    const { mode, box } = ready.choice;
    if (mode === CROP_MODE.CENTER)
        return t('images.cropRange', {
            size: sizeLabel({ width: Math.round(box.width), height: Math.round(box.height) }),
        });
    return t(mode === CROP_MODE.BLUR ? 'images.fitBlurNote' : 'images.fitExtendNote');
};

interface CropPlayerPreviewProps {
    ready: ReadySource;
    slot: CropSlot;
    info: CropPreviewInfo;
}

export function CropPlayerPreview({ ready, slot, info }: CropPlayerPreviewProps) {
    const target = SLOT_SIZES[slot];
    return (
        <div className="pane">
            <span className="label">{t('images.previewLabel')}</span>
            <div className="pv" style={themeStyle(info.theme)}>
                <div className={PREVIEW_CLASS[slot]}>
                    <ChoiceCanvas loaded={ready.loaded} choice={ready.choice} target={target} />
                    {slot === 'tile' && <b>{info.name}</b>}
                </div>
            </div>
            <div className="meta">
                <span>{t('images.outMeta', { size: sizeLabel(target) })}</span>
                <span>{choiceNote(ready)}</span>
            </div>
        </div>
    );
}
