/*
 * 直向手機（闊度 < 720px）：成頁只顯示提示（CSS media query 切換，唔使 JS）。
 * Design Origin: mockup: _mockups_/admin/index.html#s10（.rotate-note）
 */
import { Smartphone } from 'lucide-react';
import { t } from '../i18n/t';

export function RotateNotice() {
    return (
        <div className="rotate-note" data-testid="rotate-note">
            <Smartphone className="rotate-icon" aria-hidden="true" />
            <h2>{t('app.rotateTitle')}</h2>
            <p className="muted">{t('app.rotateBody')}</p>
        </div>
    );
}
