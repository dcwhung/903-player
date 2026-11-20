import { useCallback, useRef, useState, type Ref } from 'react';
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
import { AmbientView } from './AmbientView';
import { useAmbientPresence } from './useAmbientPresence';
import { useInertBackground } from './useInertBackground';

/** 淡出時長 token（Ambient.module.css 嘅淡出動畫用同一個） */
const FADE_DURATION_VAR = '--view-transition-fade';

interface AmbientContentProps {
    view: AmbientData;
    isAudible: boolean;
    wakeRef: Ref<HTMLButtonElement>;
}

/** 覆蓋層入面：節目色調嘅畫面 + 蓋住成個畫面嘅透明叫醒掣（掂任何位置返原本嗰頁） */
const AmbientContent = ({ view, isAudible, wakeRef }: AmbientContentProps) => (
    <>
        <ThemeScope theme={view.theme} fullPage={false} className={styles.scope}>
            <AmbientView view={view} isAudible={isAudible} />
        </ThemeScope>
        <button
            ref={wakeRef}
            type="button"
            className={styles.wake}
            aria-label={t('ambient.wake')}
        />
    </>
);

/** 方形螢幕先有：閒置偵測、覆蓋層、屏幕常亮 */
const SquareAmbient = () => {
    const player = usePlayer();
    const hasTrack = player.recording !== null;
    const miniPlayerDismissed = useMiniPlayerDismissed();
    // 有嘢載住（播緊 / 暫停住一集）就保持屏幕常亮，唔止閒置畫面出緊先開（用戶 2026-11-20）
    useScreenWakeLock(hasTrack && !miniPlayerDismissed);
    const { present, leaving, onLeft, handlers } = useAmbientPresence({
        hasTrack,
        miniPlayerDismissed,
    });
    const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
    const [wakeButton, setWakeButton] = useState<HTMLButtonElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    // useLeaveFallback 要 ref、useInertBackground 要 state（mount 咗先 inert）：一個 callback ref 兩樣都設
    const attachOverlay = useCallback((el: HTMLDivElement | null) => {
        overlayRef.current = el;
        setOverlay(el);
    }, []);
    useInertBackground(overlay, wakeButton, present && !leaving);
    useLeaveFallback(overlayRef, leaving, onLeft, FADE_DURATION_VAR);
    const view = ambientView({
        track: player.recording,
        isPlaying: player.isPlaying,
        currentTime: player.currentTime,
        duration: player.duration,
    });
    if (!present || !view) return null;
    return createPortal(
        <div
            ref={attachOverlay}
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={t('ambient.label')}
            data-state={leaving ? 'leaving' : 'shown'}
            {...handlers}
        >
            <AmbientContent view={view} isAudible={player.isAudible} wakeRef={setWakeButton} />
        </div>,
        document.body,
    );
};

/**
 * HomeView 閒置畫面（9b，_mockups_/home-view-ambient）：方形螢幕 30 秒冇操作就出，任何一頁都得。
 * 唔係方形螢幕就乜都唔 render、唔註冊 listener（現有裝置零改變）
 */
export const AmbientScreen = () => (useMediaQuery(SQUARE_QUERY) ? <SquareAmbient /> : null);
