/*
 * 預覽列入面一格：圖 + 標籤（一行）。dialog 各自裁切時，唔係正在調嗰個裝置就調暗；
 * 有 adjust（卡上 iPhone / Android，icon recrop）= 成格係掣，撳就單獨調嗰個裝置
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#a / #b（.icon-prev）；掣嘅狀態 mockup 冇畫，
 * 跟 .big-slot 掣嘅做法（見 phase4.css .icon-prev-adjust）
 */
import type { ReactNode } from 'react';
import type { IconDevice } from './iconModel';

export interface PreviewAdjust {
    label: string;
    onClick: () => void;
}

interface IconPreviewProps {
    label: string;
    device?: IconDevice;
    /** 各自裁切時 activeDevice；undefined = 全部實色 */
    active?: IconDevice | undefined;
    /** 有 = 成格係掣（aria-label = 調整乜嘢） */
    adjust?: PreviewAdjust | undefined;
    children: ReactNode;
}

export function IconPreview({ label, device, active, adjust, children }: IconPreviewProps) {
    const dim = active !== undefined && device !== undefined && device !== active;
    const content = (
        <>
            {children}
            <span className="icon-prev-label">{label}</span>
        </>
    );
    if (adjust)
        return (
            <button
                type="button"
                className="icon-prev icon-prev-adjust"
                data-device={device}
                aria-label={adjust.label}
                title={adjust.label}
                onClick={adjust.onClick}
            >
                {content}
            </button>
        );
    return (
        <div className="icon-prev" data-device={device} style={dim ? { opacity: 0.35 } : undefined}>
            {content}
        </div>
    );
}
