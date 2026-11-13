/*
 * App 圖示預覽列（iPhone 圓角、Android 圓形 / 方形、瀏覽器分頁），置中、平均用盡闊度。
 * dialog 入面用裁切後 canvas（即時更新）；各自裁切時只亮起正在調嗰個裝置
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#a / #b（.even / .icon-prev）
 */
import type { ReactNode } from 'react';
import { t } from '../../i18n/t';
import type { IconDevice } from './iconModel';

interface PreviewProps {
    label: string;
    device?: IconDevice;
    /** 各自裁切時 activeDevice；undefined = 全部實色 */
    active?: IconDevice | undefined;
    children: ReactNode;
}

function Preview({ label, device, active, children }: PreviewProps) {
    const dim = active !== undefined && device !== undefined && device !== active;
    return (
        <div className="icon-prev" data-device={device} style={dim ? { opacity: 0.35 } : undefined}>
            {children}
            {label}
        </div>
    );
}

export interface IconViews {
    source?: ReactNode;
    ios: ReactNode;
    round: ReactNode;
    square: ReactNode;
    tab: ReactNode;
}

/** source 有就係卡上預覽（連原圖）；冇就係 dialog 預覽（會跟 active 調暗） */
export function IconPreviews({
    views,
    active,
    tabLabel,
}: {
    views: IconViews;
    active?: IconDevice | undefined;
    tabLabel: string;
}) {
    return (
        <div className="even" aria-label={t('appearance.icon.previewsLabel')}>
            {views.source && (
                <Preview label={t('appearance.icon.previewSource')}>{views.source}</Preview>
            )}
            <Preview label={t('appearance.icon.previewIos')} device="ios" active={active}>
                <span className="ios">{views.ios}</span>
            </Preview>
            <Preview label={t('appearance.icon.previewRound')} device="android" active={active}>
                <span className="android">{views.round}</span>
            </Preview>
            <Preview label={t('appearance.icon.previewSquare')} device="android" active={active}>
                <span className="android sq">{views.square}</span>
            </Preview>
            <Preview label={t('appearance.icon.previewTab')} device="tab" active={active}>
                <span className="tab">
                    {views.tab}
                    {tabLabel}
                </span>
            </Preview>
        </div>
    );
}
