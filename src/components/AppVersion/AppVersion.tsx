import { useCallback, useState } from 'react';
import { formatAppVersion } from '../../config/appVersion';
import { t } from '../../i18n/t';
import { useTapGesture } from '../ViewportDebug/tapGesture';
import { ViewportDebug } from '../ViewportDebug/ViewportDebug';
import styles from './AppVersion.module.css';

interface AppVersionProps {
    version: string;
}

/**
 * 版本號（主頁橫額右下角）。<p> 係 generic role，aria-label 唔保證會讀，
 * 所以畫面字收埋，另外俾 screen reader 一段讀得順嘅「版本 x.y.z」。
 * 隱藏功能：2 秒內連撳 5 下開 / 關 viewport debug panel（撳一下乜都唔做）
 */
export const AppVersion = ({ version }: AppVersionProps) => {
    const [debugOpen, setDebugOpen] = useState(false);
    const onTap = useTapGesture(() => setDebugOpen((open) => !open));
    // 穩定 reference：panel 嘅 Escape listener 唔使每次 render 重新裝
    const closeDebug = useCallback(() => setDebugOpen(false), []);
    return (
        <p className={styles.version} onClick={onTap}>
            <span aria-hidden="true">{formatAppVersion(version)}</span>
            <span className={styles.srOnly}>{t('app.versionLabel', { version })}</span>
            {debugOpen && <ViewportDebug onClose={closeDebug} />}
        </p>
    );
};
