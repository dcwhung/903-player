/*
 * 更換 App 圖示 dialog 嘅細件：同一裁切 checkbox + 裝置分頁、遮罩底色色板、輸出說明、底部掣
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#b（#same / #devices / .swatches / footer）
 */
import { Upload, X } from 'lucide-react';
import type { RefObject } from 'react';
import { t } from '../../i18n/t';
import { SegmentedTabs } from '../../ui/SegmentedTabs';
import { BLACK, WHITE } from './iconColours';
import { ICON_DEVICES, type IconDevice } from './iconModel';

const DEVICE_LABEL: Record<IconDevice, string> = {
    ios: t('appearance.icon.deviceIos'),
    android: t('appearance.icon.deviceAndroid'),
    tab: t('appearance.icon.deviceTab'),
};
const DEVICE_OPTIONS = ICON_DEVICES.map((value) => ({ value, label: DEVICE_LABEL[value] }));

interface DeviceTabsProps {
    same: boolean;
    device: IconDevice;
    onSame: (same: boolean) => void;
    onDevice: (device: IconDevice) => void;
    disabled: boolean;
}

export function DeviceTabs({ same, device, onSame, onDevice, disabled }: DeviceTabsProps) {
    return (
        <div className="icon-devices">
            <label className="check-line">
                <input
                    type="checkbox"
                    checked={same}
                    disabled={disabled}
                    onChange={(event) => onSame(event.target.checked)}
                />
                {t('appearance.icon.same')}
            </label>
            {/* 同一裁切 = 成組停用、冇一個裝置揀中；上載中（disabled）鎖住但照顯示揀中嗰部（S-1104） */}
            <SegmentedTabs
                mode="toggle"
                label={t('appearance.icon.devicesLabel')}
                options={DEVICE_OPTIONS}
                value={same ? null : device}
                disabled={same || disabled}
                onChange={onDevice}
            />
        </div>
    );
}

const swatchLabel = (colour: string, index: number) => {
    if (colour === BLACK) return t('appearance.icon.maskBlack');
    if (colour === WHITE) return t('appearance.icon.maskWhite');
    return t('appearance.icon.maskExtracted', { index: index + 1 });
};

interface MaskColoursProps {
    swatches: string[];
    background: string;
    onPick: (colour: string) => void;
    disabled: boolean;
}

export function MaskColours({ swatches, background, onPick, disabled }: MaskColoursProps) {
    return (
        <div>
            <p className="cap">{t('appearance.icon.maskLabel')}</p>
            <div className="swatches" role="radiogroup" aria-label={t('appearance.icon.maskLabel')}>
                {swatches.map((colour, index) => (
                    <button
                        key={colour}
                        type="button"
                        className={`sw${colour === background ? ' on' : ''}`}
                        style={{ background: colour }}
                        role="radio"
                        aria-checked={colour === background}
                        aria-label={swatchLabel(colour, index)}
                        disabled={disabled}
                        onClick={() => onPick(colour)}
                    />
                ))}
            </div>
        </div>
    );
}

interface IconFooterProps {
    cancelRef: RefObject<HTMLButtonElement | null>;
    locked: boolean;
    busy: boolean;
    onCancel: () => void;
    onUpload: () => void;
}

export function IconDialogFooter({ cancelRef, locked, busy, onCancel, onUpload }: IconFooterProps) {
    return (
        <footer className="actions end">
            <button type="button" ref={cancelRef} onClick={onCancel} disabled={locked}>
                <X aria-hidden="true" />
                {t('images.cancel')}
            </button>
            <button
                type="button"
                className="primary"
                onClick={onUpload}
                disabled={locked}
                aria-busy={busy}
            >
                {busy ? (
                    <span className="spinner" aria-hidden="true" />
                ) : (
                    <Upload aria-hidden="true" />
                )}
                {t('appearance.icon.upload')}
            </button>
        </footer>
    );
}
