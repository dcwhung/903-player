/*
 * 更換 / 調整 App 圖示 dialog 右邊：裁切後預覽（即時）+ Android 遮罩底色 + 原圖太細警告 + 輸出說明
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#b（.icon-side）
 */
import { t } from '../../i18n/t';
import { Problem } from '../../ui/CropDialogParts';
import { IconCanvas } from './IconCanvas';
import { MaskColours } from './IconDialogParts';
import { IconPreviews, type IconViews } from './IconPreviews';
import { cropView, type IconBoxes } from './iconModel';
import type { IconReady } from './iconSession';
import type { IconCrop } from './useIconCrop';

/** 四個裝置各自用自己嘅框、Android 填遮罩底色 */
const previewViews = (crop: IconCrop, ready: IconReady, boxes: IconBoxes): IconViews => {
    const canvas = (box: IconBoxes[keyof IconBoxes], masked: boolean) => (
        <IconCanvas loaded={ready.loaded} box={box} background={masked ? crop.background : null} />
    );
    return {
        ios: canvas(boxes.ios, false),
        round: canvas(boxes.android, true),
        square: canvas(boxes.android, true),
        tab: canvas(boxes.tab, false),
    };
};

export function IconSide({ crop, tabLabel }: { crop: IconCrop; tabLabel: string }) {
    const { ready, same, device, boxes } = crop;
    if (!ready || !boxes) return null;
    const view = cropView(same, device);
    return (
        <div className="icon-side">
            <p className="state-label">{t('appearance.icon.preview')}</p>
            <IconPreviews
                views={previewViews(crop, ready, boxes)}
                active={same ? undefined : device}
                tabLabel={tabLabel}
            />
            <MaskColours
                swatches={crop.swatches}
                background={crop.background}
                onPick={crop.setBackground}
                disabled={crop.busy !== null}
            />
            {crop.small && (
                <Problem
                    message={t('appearance.icon.small', {
                        size: `${ready.loaded.source.width} × ${ready.loaded.source.height}`,
                    })}
                />
            )}
            <p className="hint">{t(view.out)}</p>
        </div>
    );
}
