/*
 * 首頁 Banner 兩個 slot（窄版 1200×517、闊版 2000×400）：冇自訂就顯示內建預設圖；撳任何一個都由窄版開始換
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#e（.img-slot.banner-std / .banner-long）
 */
import { Pencil } from 'lucide-react';
import { imageUrl } from '../../api/endpoints';
import type { BannerImages } from '../../api/types';
import longDefault from '../../assets/banner/banner-wide.webp';
import standardDefault from '../../assets/banner/banner.webp';
import { t } from '../../i18n/t';
import { SLOT_SIZES, sizeLabel } from '../../ui/imageUpload';

const SLOTS = [
    { key: 'standard', slot: 'bannerStandard', className: 'banner-std', cap: 'banner.standardCap' },
    { key: 'long', slot: 'bannerLong', className: 'banner-long', cap: 'banner.longCap' },
] as const;

const DEFAULTS: Record<keyof BannerImages, string> = {
    standard: standardDefault,
    long: longDefault,
};

interface BannerSlotsProps {
    banner: BannerImages | null;
    disabled: boolean;
    onChange: () => void;
}

export function BannerSlots({ banner, disabled, onChange }: BannerSlotsProps) {
    return (
        <div className="media banner-media">
            {SLOTS.map(({ key, slot, className, cap }) => (
                <div className="slot" key={key}>
                    <button
                        type="button"
                        className={`img-slot ${className}`}
                        aria-label={t('banner.slotLabel')}
                        disabled={disabled}
                        onClick={onChange}
                    >
                        <span
                            className="thumb"
                            style={{
                                backgroundImage: `url("${banner ? imageUrl(banner[key]) : DEFAULTS[key]}")`,
                            }}
                        />
                        <span className="slot-btn" aria-hidden="true">
                            <Pencil />
                        </span>
                    </button>
                    <span className="slot-cap">
                        <span className="cap">{t(cap)}</span>
                        <span className="hint">
                            {t('banner.hint', { size: sizeLabel(SLOT_SIZES[slot]) })}
                        </span>
                    </span>
                </div>
            ))}
        </div>
    );
}
