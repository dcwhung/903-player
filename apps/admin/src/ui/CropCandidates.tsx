/*
 * 裁切候選三粒掣（縮圖 + 名）：置中裁切（預設）/ 完整 · 模糊背景 / 完整 · 延伸邊緣
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#b（.cands / .cand）
 */
import { t } from '../i18n/t';
import { ChoiceCanvas } from './ChoiceCanvas';
import { CROP_MODES, type CropMode } from './cropGeometry';
import type { CropChoice } from './cropRender';
import { SLOT_SIZES, type CropSlot } from './imageUpload';
import type { ReadySource } from './useCropSession';

const MODE_LABELS: Record<CropMode, Parameters<typeof t>[0]> = {
    center: 'images.modeCenter',
    blur: 'images.modeBlur',
    extend: 'images.modeExtend',
};

export const modeLabel = (mode: CropMode) => t(MODE_LABELS[mode]);

interface CropCandidatesProps {
    ready: ReadySource;
    slot: CropSlot;
    disabled: boolean;
    onChoice: (choice: CropChoice) => void;
}

export function CropCandidates({ ready, slot, disabled, onChoice }: CropCandidatesProps) {
    return (
        <div className="cands" role="group" aria-label={t('images.candidatesLabel')}>
            {CROP_MODES.map((mode) => {
                // 揀返置中裁切時沿用之前拖好嘅框
                const choice = { mode, box: ready.choice.box };
                return (
                    <button
                        key={mode}
                        type="button"
                        className={`cand${slot === 'disc' ? ' disc' : ''}`}
                        aria-pressed={ready.choice.mode === mode}
                        disabled={disabled}
                        onClick={() => onChoice(choice)}
                    >
                        <ChoiceCanvas
                            loaded={ready.loaded}
                            choice={choice}
                            target={SLOT_SIZES[slot]}
                        />
                        <span>{modeLabel(mode)}</span>
                    </button>
                );
            })}
        </div>
    );
}
