/*
 * App banner + 橙色「Admin vX」pill（版本 = apps/api/package.json，build 時注入）。Design Origin: mockup #s1 / #uB（.brand-banner）
 * banner 放 public/（/banner.webp，檔名固定）：Worker 嘅 403 頁（apps/api/src/auth/deniedPage.ts）都用同一個檔
 */
import { t } from '../i18n/t';

export const BANNER_PATH = '/banner.webp';

export function Brand({ big = false }: { big?: boolean }) {
    return (
        <span className={`brand-banner${big ? ' big' : ''}`}>
            <img src={BANNER_PATH} alt={t('app.bannerAlt')} width={1200} height={517} />
            <span className="ver-pill">{t('app.version', { version: __API_VERSION__ })}</span>
        </span>
    );
}
