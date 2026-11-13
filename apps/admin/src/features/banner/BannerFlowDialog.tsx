/*
 * 首頁 Banner 兩步裁切 dialog（同封面一樣嘅 ImagePreviewDialog）：1 / 2 窄版 → 2 / 2 闊版
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#b（crop-step pill、上一張、下一張：闊版、上載兩張）
 */
import { t } from '../../i18n/t';
import { themeOf } from '../../model/theme';
import { slotName } from '../../ui/CropEditor';
import { ImagePreviewDialog } from '../../ui/ImagePreviewDialog';
import { SLOT_SIZES, sizeLabel } from '../../ui/imageUpload';
import { BANNER_STEPS, type BannerFlow } from './useBannerFlow';

/** 首頁 Banner 預覽唔用節目配色：中性底 */
const PREVIEW = { name: '', theme: themeOf({}) };

export function BannerFlowDialog({ flow }: { flow: BannerFlow }) {
    const { phase } = flow.current;
    const slot = BANNER_STEPS[flow.step] ?? BANNER_STEPS[0];
    if (!phase) return null;
    const last = flow.step === BANNER_STEPS.length - 1;
    return (
        <ImagePreviewDialog
            key={slot}
            slot={slot}
            title={t('banner.dialogTitle', {
                slot: slotName(slot),
                size: sizeLabel(SLOT_SIZES[slot]),
            })}
            phase={phase}
            info={PREVIEW}
            busy={flow.busy}
            error={flow.error}
            step={{ index: flow.step, count: BANNER_STEPS.length }}
            next={!last}
            onChoice={flow.current.choose}
            onConfirm={last ? () => void flow.confirm() : flow.next}
            onCancel={flow.close}
            onBack={flow.step > 0 ? flow.back : undefined}
            onPickOther={flow.start}
        />
    );
}
