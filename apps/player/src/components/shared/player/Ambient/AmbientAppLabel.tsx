import { APP_SHORT_NAME } from '../../../../config/appShortName';
import styles from './Ambient.module.css';

/** public/ 嘅 icon 跟 Vite BASE_URL（Vercel `/`、GitHub Pages `/903-player/`）；branding 有 icon 會覆蓋同名檔 */
const ICON_SRC = `${import.meta.env.BASE_URL}apple-touch-icon.png`;

/**
 * 閒置畫面左上 app 標籤（9c，_mockups_/home-view-night 第 6 輪）：app icon + 短名，冇膠囊底，
 * 同右上睡眠 timer 同一條線。讀屏唔讀（覆蓋層 dialog 已經有名）
 */
export const AmbientAppLabel = () => (
    <p className={styles.appLabel} data-ambient-label="" aria-hidden="true">
        <img className={styles.appIcon} src={ICON_SRC} alt="" />
        <span className={styles.appName}>{APP_SHORT_NAME}</span>
    </p>
);
