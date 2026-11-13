/*
 * 裁切候選三粒掣（縮圖 + 名）：置中裁切（預設）/ 完整 · 模糊背景 / 完整 · 延伸邊緣
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#b（.cands / .cand）
 * 拖緊裁切框時置中裁切縮圖停喺撳落前嘅框，放手先跟新框重畫（S-910；播放器預覽照跟）
 */
import { useState } from 'react';
import { t } from '../i18n/t';
import { ChoiceCanvas } from './ChoiceCanvas';
import { CROP_MODES, type CropMode, type CropRect } from './cropGeometry';
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
    /** 拖緊裁切框：縮圖用返撳落前嘅框 */
    dragging?: boolean;
    onChoice: (choice: CropChoice) => void;
}

/** 唔係拖緊就跟住 box；拖緊就停喺上一個（derived state，喺 render 入面更新） */
const useSettledBox = (box: CropRect, dragging: boolean) => {
    const [settled, setSettled] = useState(box);
    if (!dragging && settled !== box) setSettled(box);
    return dragging ? settled : box;
};

export function CropCandidates(props: CropCandidatesProps) {
    const { ready, slot, disabled, dragging = false, onChoice } = props;
    const settledBox = useSettledBox(ready.choice.box, dragging);
    return (
        <div className="cands" role="group" aria-label={t('images.candidatesLabel')}>
            {CROP_MODES.map((mode) => {
                // 揀返置中裁切時沿用之前拖好嘅框
                const choice = { mode, box: ready.choice.box };
                const shown = { mode, box: settledBox };
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
                            choice={shown}
                            target={SLOT_SIZES[slot]}
                        />
                        <span>{modeLabel(mode)}</span>
                    </button>
                );
            })}
        </div>
    );
}
