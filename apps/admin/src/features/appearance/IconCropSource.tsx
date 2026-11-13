/*
 * 更換 App 圖示左邊：原圖 + 正方形裁切框（拖曳移位、拖右下角縮放）。Android / 同一裁切顯示安全區虛線圈，
 * Android 單獨調時框係圓形。拖曳 / 鍵盤同封面一樣（useCropDrag）
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#b（.crop-box / .crop-frame / .safe）
 */
import { t } from '../../i18n/t';
import { CROP_MODE, type CropRect } from '../../ui/cropGeometry';
import { cropBoxStyle } from '../../ui/imageCrop';
import { useCropDrag } from '../../ui/useCropDrag';
import type { ReadySource } from '../../ui/useCropSession';
import { ICON_SQUARE, type IconCropView } from './iconModel';
import type { IconReady } from './iconSession';

const EMPTY_BOX: CropRect = { x: 0, y: 0, width: 0, height: 0 };

interface IconCropSourceProps {
    ready: IconReady;
    box: CropRect;
    view: IconCropView;
    locked: boolean;
    onBox: (box: CropRect) => void;
}

export function IconCropSource({ ready, box, view, locked, onBox }: IconCropSourceProps) {
    // useCropDrag 只讀 loaded.source 同 choice.box
    const shaped = {
        ...ready,
        name: ready.file.name,
        choice: { mode: CROP_MODE.CENTER, box: box ?? EMPTY_BOX },
    } as unknown as ReadySource;
    const { boxHandlers, gripHandlers } = useCropDrag(shaped, ICON_SQUARE, locked, (choice) =>
        onBox(choice.box),
    );
    const boxClass = ['box', view.round ? 'circle' : '', locked ? 'locked' : ''];
    return (
        <div className="icon-crop">
            <p className="state-label" id="icon-crop-cap">
                {t(view.cap)}
            </p>
            <div className="src">
                <img src={ready.sourceUrl} alt={t('images.previewSourceAlt')} draggable={false} />
                <span
                    className={boxClass.filter(Boolean).join(' ')}
                    style={cropBoxStyle(ready.loaded.source, box)}
                    role="group"
                    tabIndex={0}
                    aria-label={t('images.cropBox')}
                    {...boxHandlers}
                >
                    {view.safe && <span className="safe" aria-hidden="true" />}
                    <span className="grip" aria-hidden="true" {...gripHandlers} />
                </span>
            </div>
        </div>
    );
}
