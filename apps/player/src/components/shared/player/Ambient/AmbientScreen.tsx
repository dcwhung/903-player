import { useCallback, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { SQUARE_QUERY } from '../../../../config/layout';
import { useMiniPlayerDismissed } from '../../../../hooks/miniPlayerDismissed';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { useScreenWakeLock } from '../../../../hooks/useScreenWakeLock';
import { t } from '../../../../i18n/t';
import { usePlayer } from '../../../../player/usePlayer';
import { ambientView, type AmbientView as AmbientData } from '../../../../selectors/ambient';
import { ThemeScope } from '../../common/ThemeScope/ThemeScope';
import { useLeaveFallback } from '../PlayerHandle/useLeaveFallback';
import styles from './Ambient.module.css';
import { AmbientAppLabel } from './AmbientAppLabel';
import { AmbientView } from './AmbientView';
import { AmbientWakeVeil } from './AmbientWakeVeil';
import { NIGHT_PALETTE_STYLE } from './ambientNightPalette';
import { useAmbientNight } from './useAmbientNight';
import { useAmbientPresence, type AmbientPresence } from './useAmbientPresence';
import { useAmbientWake } from './useAmbientWake';
import { useInertBackground } from './useInertBackground';

/** 淡出時長 token（Ambient.module.css 嘅淡出動畫用同一個） */
const FADE_DURATION_VAR = '--view-transition-fade';

/** 底圖：app icon（public/，跟 Vite BASE_URL）；CSS module 唔處理 public 路徑，經 CSS 變數傳入 */
const BACKDROP_STYLE = {
    '--ambient-backdrop-image': `url("${import.meta.env.BASE_URL}icon-maskable-512.png")`,
} as CSSProperties;

/**
 * 覆蓋層入面：節目色調嘅畫面（模糊 app icon 底圖 + 節目底色、左上 app 標籤、內容）
 * + 蓋住成個畫面嘅透明叫醒掣（掂任何位置返原本嗰頁；讀屏名「返回」）
 */
const AmbientContent = ({ view, isAudible }: { view: AmbientData; isAudible: boolean }) => (
    <>
        <ThemeScope theme={view.theme} fullPage={false} className={styles.scope}>
            <div
                className={styles.backdrop}
                data-ambient-backdrop=""
                aria-hidden="true"
                style={BACKDROP_STYLE}
            />
            <AmbientAppLabel />
            <AmbientView view={view} isAudible={isAudible} />
        </ThemeScope>
        <button type="button" className={styles.wake} aria-label={t('ambient.wake')} />
    </>
);

type AmbientOverlayProps = Pick<AmbientPresence, 'leaving' | 'onLeft' | 'handlers'> & {
    /** 9c 叫醒過嘅時間到（之後再閒置唔即刻暗） */
    acknowledgedExpiryAt: number | null;
    /** 夜間程度元素（叫醒時量暗度開遮罩） */
    levelRef: RefObject<HTMLSpanElement | null>;
};

/**
 * 覆蓋層（出緊 / 淡出緊先 mount）：播放狀態（每次 timeupdate 都變）同 ambientView 只喺呢度讀，
 * 冇出嘅時候唔會跟住播放進度計（S-1300）。焦點放喺覆蓋層自己（tabIndex -1），
 * 唔放喺成個畫面咁大嘅叫醒掣，唔會出全屏焦點框（W-850）
 */
const AmbientOverlay = ({
    leaving,
    onLeft,
    handlers,
    acknowledgedExpiryAt,
    levelRef,
}: AmbientOverlayProps) => {
    const player = usePlayer();
    const night = useAmbientNight(acknowledgedExpiryAt);
    const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    // useLeaveFallback 要 ref、useInertBackground 要 state（mount 咗先 inert）：一個 callback ref 兩樣都設
    const attachOverlay = useCallback((el: HTMLDivElement | null) => {
        overlayRef.current = el;
        setOverlay(el);
    }, []);
    useInertBackground(overlay, overlay, !leaving);
    useLeaveFallback(overlayRef, leaving, onLeft, FADE_DURATION_VAR);
    const view = ambientView({
        track: player.recording,
        isPlaying: player.isPlaying,
        currentTime: player.currentTime,
        duration: player.duration,
    });
    if (!view) return null;
    return createPortal(
        <div
            ref={attachOverlay}
            className={`${styles.nightPalette} ${styles.overlay}`}
            style={NIGHT_PALETTE_STYLE}
            role="dialog"
            aria-modal="true"
            aria-label={t('ambient.label')}
            tabIndex={-1}
            data-state={leaving ? 'leaving' : 'shown'}
            data-ambient-night={night ? '' : undefined}
            {...handlers}
        >
            <AmbientContent view={view} isAudible={player.isAudible} />
            <span
                ref={levelRef}
                className={styles.nightLevel}
                data-ambient-night-level=""
                aria-hidden="true"
            />
        </div>,
        document.body,
    );
};

/** 方形螢幕先有：閒置偵測、屏幕常亮；覆蓋層出緊先 mount；9c 叫醒遮罩喺覆蓋層拆走後照留 3 秒 */
const SquareAmbient = () => {
    const hasTrack = usePlayer().recording !== null;
    const miniPlayerDismissed = useMiniPlayerDismissed();
    // 有嘢載住（播緊 / 暫停住一集）就保持屏幕常亮，唔止閒置畫面出緊先開（用戶 2026-11-20）
    useScreenWakeLock(hasTrack && !miniPlayerDismissed);
    const { acknowledgedExpiryAt, veilFrom, levelRef, onWake, onVeilDone } = useAmbientWake();
    const { present, ...overlay } = useAmbientPresence({ hasTrack, miniPlayerDismissed }, onWake);
    return (
        <>
            {present && (
                <AmbientOverlay
                    {...overlay}
                    acknowledgedExpiryAt={acknowledgedExpiryAt}
                    levelRef={levelRef}
                />
            )}
            {veilFrom !== null && <AmbientWakeVeil from={veilFrom} onDone={onVeilDone} />}
        </>
    );
};

/**
 * HomeView 閒置畫面（9b，_mockups_/home-view-ambient）：方形螢幕 30 秒冇操作就出，任何一頁都得。
 * 唔係方形螢幕就乜都唔 render、唔註冊 listener（現有裝置零改變）
 */
export const AmbientScreen = () => (useMediaQuery(SQUARE_QUERY) ? <SquareAmbient /> : null);
