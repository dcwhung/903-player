import { useCallback, useState } from 'react';
import { formatAppVersion } from '../../config/appVersion';
import { copyPlaybackLog } from '../../player/playbackLog';
import { t } from '../../i18n/t';
import { useTapGesture } from '../ViewportDebug/tapGesture';
import { ViewportDebug } from '../ViewportDebug/ViewportDebug';
import styles from './AppVersion.module.css';

const LOG_LABEL = 'playback log';
const PLAYBACK_LOG_COPYING = [LOG_LABEL, 'copying…'] as const;

interface AppVersionProps {
    version: string;
}

/**
 * 版本號（主頁橫額右下角）。<p> 係 generic role，aria-label 唔保證會讀，
 * 所以畫面字收埋，另外俾 screen reader 一段讀得順嘅「版本 x.y.z」。
 * 隱藏功能：2 秒內連撳 5 下開 / 關 viewport debug panel（撳一下乜都唔做）；
 * 開嗰下順手複製播放診斷 log（要喺撳嘅 handler 入面先寫到剪貼簿）
 */
export const AppVersion = ({ version }: AppVersionProps) => {
    const [debugOpen, setDebugOpen] = useState(false);
    const [logRow, setLogRow] = useState<readonly [string, string]>();
    const onTap = useTapGesture(() => {
        if (!debugOpen) {
            setLogRow(PLAYBACK_LOG_COPYING);
            void copyPlaybackLog().then((count) => setLogRow([LOG_LABEL, `copied ${count} lines`]));
        }
        setDebugOpen(!debugOpen);
    });
    // 穩定 reference：panel 嘅 Escape listener 唔使每次 render 重新裝
    const closeDebug = useCallback(() => setDebugOpen(false), []);
    return (
        <p className={styles.version} onClick={onTap}>
            <span aria-hidden="true">{formatAppVersion(version)}</span>
            <span className={styles.srOnly}>{t('app.versionLabel', { version })}</span>
            {debugOpen && <ViewportDebug onClose={closeDebug} extraRows={logRow ? [logRow] : []} />}
        </p>
    );
};
