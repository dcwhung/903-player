import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { SleepTimerOption } from '../../../../player/sleepTimer';
import { SleepTimerScheduleContext } from '../../../../player/sleepTimerContext';
import type { SleepTimerScheduler } from '../../../../player/SleepTimerScheduler';
import { useToast } from '../../common/Toast/toastStore';
import { autoStartText, useSleepTimerAutoToast } from './useSleepTimerAutoToast';

/** 淨係 onAutoStart 嘅假排程：測 toast 文字同訂閱 / 解除 */
const fakeScheduler = () => {
    const listeners = new Set<(option: SleepTimerOption) => void>();
    const scheduler = {
        onAutoStart: (listener: (option: SleepTimerOption) => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    } as unknown as SleepTimerScheduler;
    return { scheduler, fire: (option: SleepTimerOption) => listeners.forEach((l) => l(option)) };
};

describe('autoStartText', () => {
    it('should say when the timer will pause', () => {
        expect(autoStartText(30)).toBe('休眠 30 分鐘後啟動');
        expect(autoStartText(15)).toBe('休眠 15 分鐘後啟動');
        expect(autoStartText('episode')).toBe('休眠播完呢集後啟動');
    });
});

describe('useSleepTimerAutoToast', () => {
    it('should show a toast when the nightly schedule starts the timer, and stop listening on unmount', () => {
        const { scheduler, fire } = fakeScheduler();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <SleepTimerScheduleContext.Provider value={scheduler}>
                {children}
            </SleepTimerScheduleContext.Provider>
        );
        const toast = renderHook(() => useToast());
        const { unmount } = renderHook(() => useSleepTimerAutoToast(), { wrapper });

        act(() => fire(60));
        expect(toast.result.current?.text).toBe('休眠 60 分鐘後啟動');

        unmount();
        act(() => fire('episode'));
        expect(toast.result.current?.text).toBe('休眠 60 分鐘後啟動');
    });

    it('should do nothing outside the PlayerProvider', () => {
        const Probe = () => {
            useSleepTimerAutoToast();
            return null;
        };
        expect(() => render(<Probe />)).not.toThrow();
    });
});
