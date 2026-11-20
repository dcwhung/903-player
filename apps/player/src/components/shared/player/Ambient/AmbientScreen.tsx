import { useCallback, useRef, useState } from 'react';
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
import { useAmbientPresence, type AmbientPresence } from './useAmbientPresence';
import { useInertBackground } from './useInertBackground';

/** 淡出時長 token（Ambient.module.css 嘅淡出動畫用同一個） */
const FADE_DURATION_VAR = '--view-transition-fade';

/** 覆蓋層入面：節目色調嘅畫面 + 蓋住成個畫面嘅透明叫醒掣（掂任何位置返原本嗰頁；讀屏名「返回」） */
const AmbientContent = ({ view, isAudible }: { view: AmbientData; isAudible: boolean }) => (
    <>
        <ThemeScope theme={view.theme} fullPage={false} className={styles.scope}>
            <AmbientView view={view} isAudible={isAudible} />
        </ThemeScope>
        <button type="button" className={styles.wake} aria-label={t('ambient.wake')} />
    </>
);

type AmbientOverlayProps = Pick<AmbientPresence, 'leaving' | 'onLeft' | 'handlers'>;

/**
 * 覆蓋層（出緊 / 淡出緊先 mount）：播放狀態（每次 timeupdate 都變）同 ambientView 只喺呢度讀，
 * 冇出嘅時候唔會跟住播放進度計（S-1300）。焦點放喺覆蓋層自己（tabIndex -1），
 * 唔放喺成個畫面咁大嘅叫醒掣，唔會出全屏焦點框（W-850）
 */
const AmbientOverlay = ({ leaving, onLeft, handlers }: AmbientOverlayProps) => {
    const player = usePlayer();
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
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={t('ambient.label')}
            tabIndex={-1}
            data-state={leaving ? 'leaving' : 'shown'}
            {...handlers}
        >
            <AmbientContent view={view} isAudible={player.isAudible} />
        </div>,
        document.body,
    );
};

/** 方形螢幕先有：閒置偵測、屏幕常亮；覆蓋層出緊先 mount */
const SquareAmbient = () => {
    const hasTrack = usePlayer().recording !== null;
    const miniPlayerDismissed = useMiniPlayerDismissed();
    // 有嘢載住（播緊 / 暫停住一集）就保持屏幕常亮，唔止閒置畫面出緊先開（用戶 2026-11-20）
    useScreenWakeLock(hasTrack && !miniPlayerDismissed);
    const { present, ...overlay } = useAmbientPresence({ hasTrack, miniPlayerDismissed });
    return present ? <AmbientOverlay {...overlay} /> : null;
};

/**
 * HomeView 閒置畫面（9b，_mockups_/home-view-ambient）：方形螢幕 30 秒冇操作就出，任何一頁都得。
 * 唔係方形螢幕就乜都唔 render、唔註冊 listener（現有裝置零改變）
 */
export const AmbientScreen = () => (useMediaQuery(SQUARE_QUERY) ? <SquareAmbient /> : null);
