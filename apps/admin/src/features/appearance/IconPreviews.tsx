/*
 * App 圖示預覽列（iPhone 圓角、Android 圓形 / 方形、瀏覽器分頁），置中、平均用盡闊度。
 * dialog 入面用裁切後 canvas（即時更新）；各自裁切時只亮起正在調嗰個裝置。
 * 卡上（有 onAdjust，icon recrop）：iPhone、Android 圓形 / 方形係掣，撳就單獨調嗰個裝置
 * （Android 圓形同方形係同一張 maskable，兩個都開 Android）
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#a / #b（.even / .icon-prev）
 */
import type { ReactNode } from 'react';
import { t } from '../../i18n/t';
import { IconPreview, type PreviewAdjust } from './IconPreview';
import {
    ICON_PREVIEW_SLOTS,
    type AdjustableDevice,
    type IconDevice,
    type IconPreviewSlot,
} from './iconModel';

export interface IconViews {
    source?: ReactNode;
    ios: ReactNode;
    round: ReactNode;
    square: ReactNode;
    tab: ReactNode;
}

type OnAdjust = ((device: AdjustableDevice) => void) | undefined;

const adjustOf = (onAdjust: OnAdjust, slot: IconPreviewSlot): PreviewAdjust | undefined =>
    onAdjust && { label: t(slot.adjustLabel), onClick: () => onAdjust(slot.device) };

/** source 有就係卡上預覽（連原圖）；冇就係 dialog 預覽（會跟 active 調暗） */
export function IconPreviews({
    views,
    active,
    tabLabel,
    onAdjust,
}: {
    views: IconViews;
    active?: IconDevice | undefined;
    tabLabel: string;
    onAdjust?: OnAdjust;
}) {
    return (
        <div className="even" aria-label={t('appearance.icon.previewsLabel')}>
            {views.source && (
                <IconPreview label={t('appearance.icon.previewSource')}>{views.source}</IconPreview>
            )}
            {ICON_PREVIEW_SLOTS.map((slot) => (
                <IconPreview
                    key={slot.view}
                    label={t(slot.label)}
                    device={slot.device}
                    active={active}
                    adjust={adjustOf(onAdjust, slot)}
                >
                    <span className={slot.className}>{views[slot.view]}</span>
                </IconPreview>
            ))}
            <IconPreview label={t('appearance.icon.previewTab')} device="tab" active={active}>
                <span className="tab">
                    {views.tab}
                    <span className="tab-title" title={tabLabel}>
                        {tabLabel}
                    </span>
                </span>
            </IconPreview>
        </div>
    );
}
