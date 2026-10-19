import { formatAppVersion } from '../../config/appVersion';
import { t } from '../../i18n/t';
import styles from './AppVersion.module.css';

interface AppVersionProps {
    version: string;
}

/**
 * 頁底版本號。<p> 係 generic role，aria-label 唔保證會讀，
 * 所以畫面字收埋，另外俾 screen reader 一段讀得順嘅「版本 x.y.z」。
 */
export const AppVersion = ({ version }: AppVersionProps) => (
    <p className={styles.version}>
        <span aria-hidden="true">{formatAppVersion(version)}</span>
        <span className={styles.srOnly}>{t('app.versionLabel', { version })}</span>
    </p>
);
