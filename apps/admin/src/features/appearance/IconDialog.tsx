/*
 * 更換 App 圖示 dialog（Q6）：左 = 原圖 + 正方形裁切框；右 = 預覽 + Android 遮罩底色 + 輸出說明。
 * 「所有裝置使用同一裁切」= 一個框；取消勾選後撳裝置分頁逐個調，預覽只亮起嗰個。「上載」= 五張 PNG → branding
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#b
 */
import { useId } from 'react';
import { t } from '../../i18n/t';
import { Loading, Problem } from '../../ui/CropDialogParts';
import { useModalKeys } from '../../ui/useModalKeys';
import { IconCanvas } from './IconCanvas';
import { IconCropSource } from './IconCropSource';
import { DeviceTabs, IconDialogFooter, MaskColours } from './IconDialogParts';
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

function IconSide({ crop, tabLabel }: { crop: IconCrop; tabLabel: string }) {
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

function IconEditor({ crop, tabLabel }: { crop: IconCrop; tabLabel: string }) {
    const { ready, same, device, activeBox } = crop;
    if (!ready || !activeBox) return null;
    return (
        <div className="icon-editor">
            <DeviceTabs
                same={same}
                device={device}
                onSame={crop.setSame}
                onDevice={crop.setDevice}
                disabled={crop.busy !== null}
            />
            <div className="icon-editor-body">
                <IconCropSource
                    ready={ready}
                    box={activeBox}
                    view={cropView(same, device)}
                    locked={crop.busy !== null}
                    onBox={crop.setBox}
                />
                <IconSide crop={crop} tabLabel={tabLabel} />
            </div>
        </div>
    );
}

function DialogBody({ crop, tabLabel }: { crop: IconCrop; tabLabel: string }) {
    const phase = crop.session.phase;
    if (!phase) return null;
    return (
        <>
            {phase.status === 'loading' && <Loading name={phase.name} bytes={phase.bytes} />}
            {phase.status === 'error' && <Problem message={phase.message} />}
            {phase.status === 'ready' && <IconEditor crop={crop} tabLabel={tabLabel} />}
            {crop.busy && (
                <p className="note info" role="status">
                    <span className="spinner" aria-hidden="true" />
                    <span>{crop.busy}</span>
                </p>
            )}
            {crop.error && <Problem message={crop.error} />}
        </>
    );
}

interface IconDialogProps {
    crop: IconCrop;
    tabLabel: string;
    onUpload: () => void;
    onCancel: () => void;
}

export function IconDialog({ crop, tabLabel, onUpload, onCancel }: IconDialogProps) {
    const titleId = useId();
    const phase = crop.session.phase;
    const locked = crop.busy !== null || phase?.status === 'loading';
    const { dialogRef, cancelRef, scrimProps } = useModalKeys(onCancel, locked);
    if (!phase) return null;
    return (
        <div className="scrim" {...scrimProps}>
            <div
                ref={dialogRef}
                className="card crop-dialog icon-dialog"
                role={phase.status === 'error' ? 'alertdialog' : 'dialog'}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-busy={locked}
                tabIndex={-1}
            >
                <header>
                    <h3 id={titleId}>{t('appearance.icon.dialogTitle')}</h3>
                    {phase.status === 'ready' && (
                        <span className="meta mono">{phase.file.name}</span>
                    )}
                </header>
                <DialogBody crop={crop} tabLabel={tabLabel} />
                <IconDialogFooter
                    cancelRef={cancelRef}
                    locked={locked}
                    busy={crop.busy !== null}
                    onCancel={onCancel}
                    onUpload={onUpload}
                />
            </div>
        </div>
    );
}
