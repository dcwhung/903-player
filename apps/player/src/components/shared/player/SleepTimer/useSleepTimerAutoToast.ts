import { useContext, useEffect } from 'react';
import { t } from '../../../../i18n/t';
import type { SleepTimerOption } from '../../../../player/sleepTimer';
import { SleepTimerScheduleContext } from '../../../../player/sleepTimerContext';
import { showToast } from '../../common/Toast/toastStore';

/** 「休眠 30 分鐘後啟動」/「休眠播完呢集後啟動」 */
export const autoStartText = (option: SleepTimerOption): string =>
    option === 'episode'
        ? t('sleepTimer.autoStartEpisode')
        : t('sleepTimer.autoStartMinutes', { minutes: option });

/**
 * 每晚自動生效（SleepTimerScheduler）時出 toast：App 嘅 PlaybackObservers 掛一次，唔跟頁面 mount / unmount。
 * 冇 PlayerProvider（單獨 render）就乜都唔做
 */
export const useSleepTimerAutoToast = (): void => {
    const scheduler = useContext(SleepTimerScheduleContext);
    useEffect(
        () => scheduler?.onAutoStart((option) => showToast(autoStartText(option))),
        [scheduler],
    );
};
