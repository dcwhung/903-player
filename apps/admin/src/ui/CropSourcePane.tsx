/*
 * 裁切 dialog 左邊：原圖 + 裁切框（置中裁切可以拖曳移位、拖右下角縮放；碟面框係圓形；
 * fit 兩款鎖住成張圖、虛線框唔拖得）。拖曳 / 鍵盤見 useCropDrag
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#b（.src-frame / .box / .grip）
 */
import { t } from '../i18n/t';
import { CROP_MODE } from './cropGeometry';
import type { CropChoice } from './cropRender';
import { cropBoxStyle } from './imageCrop';
import type { CropSlot } from './imageUpload';
import { useCropDrag } from './useCropDrag';
import type { ReadySource } from './useCropSession';

interface CropSourcePaneProps {
    ready: ReadySource;
    slot: CropSlot;
    disabled: boolean;
    onChoice: (choice: CropChoice) => void;
}

export function CropSourcePane({ ready, slot, disabled, onChoice }: CropSourcePaneProps) {
    const center = ready.choice.mode === CROP_MODE.CENTER;
    const locked = !center || disabled;
    const { boxHandlers, gripHandlers } = useCropDrag(ready, slot, locked, onChoice);
    const { source } = ready.loaded;
    const shown = center ? ready.choice.box : { x: 0, y: 0, ...source };
    const boxClass = ['box', locked ? 'locked' : '', slot === 'disc' && !locked ? 'circle' : ''];
    return (
        <div className="src-frame">
            <div className="src">
                <img src={ready.sourceUrl} alt={t('images.previewSourceAlt')} draggable={false} />
                <span
                    className={boxClass.filter(Boolean).join(' ')}
                    style={cropBoxStyle(source, shown)}
                    role={locked ? undefined : 'group'}
                    tabIndex={locked ? undefined : 0}
                    aria-label={locked ? undefined : t('images.cropBox')}
                    {...boxHandlers}
                >
                    <span className="grip" aria-hidden="true" {...gripHandlers} />
                </span>
            </div>
        </div>
    );
}
