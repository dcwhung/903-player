/* App banner + 橙色「Admin vX」pill（版本 = apps/api/package.json，build 時注入）。Design Origin: mockup #s1 / #uB（.brand-banner） */
import banner from '../assets/banner.webp';
import { t } from '../i18n/t';

export function Brand({ big = false }: { big?: boolean }) {
    return (
        <span className={`brand-banner${big ? ' big' : ''}`}>
            <img src={banner} alt={t('app.bannerAlt')} width={1200} height={517} />
            <span className="ver-pill">{t('app.version', { version: __API_VERSION__ })}</span>
        </span>
    );
}
