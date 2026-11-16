/*
 * 更換 / 調整 App 圖示 dialog（Q6）：左 = 原圖 + 正方形裁切框；右 = 預覽 + Android 遮罩底色 + 輸出說明。
 * 「所有裝置使用同一裁切」= 一個框；取消勾選後撳裝置分頁逐個調，預覽只亮起嗰個。「上載」= 五張 PNG → branding。
 * 調整（icon recrop，由卡上預覽開）：同一個 dialog，標題「調整 App 圖示」；舊圖示冇原圖就出提示（用 512 圖頂住）
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#b
 */
import { useId } from 'react';
import { t } from '../../i18n/t';
import { Loading, Problem } from '../../ui/CropDialogParts';
import { useModalKeys } from '../../ui/useModalKeys';
import { IconCropSource } from './IconCropSource';
import { DeviceTabs, IconDialogFooter } from './IconDialogParts';
import { IconSide } from './IconSide';
import { cropView } from './iconModel';
import type { IconCrop } from './useIconCrop';

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
            {phase.status === 'ready' && phase.seed.fallback && (
                <p className="note info">{t('appearance.icon.fallbackNote')}</p>
            )}
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
                    <h3 id={titleId}>
                        {t(
                            crop.adjusting
                                ? 'appearance.icon.adjustTitle'
                                : 'appearance.icon.dialogTitle',
                        )}
                    </h3>
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
