import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RecordingsProvider, type RecordingsProber } from '../src/data/RecordingsProvider';
import { PlayerProvider } from '../src/player/PlayerProvider';
import type { Recording } from '../src/types/recording';
import { FakeAudio } from './fakeAudio';

interface Options {
    route?: string;
    path?: string;
    /** 當係 storage 已經有嘅錄音 */
    recordings?: Recording[];
    /** 預設 probe 即刻完、乜都搵唔到（唔會真係 probe 原站） */
    prober?: RecordingsProber;
    /** 額外路由，例如模擬由其他頁返嚟 */
    extraRoutes?: { path: string; element: ReactElement }[];
}

/** 測試預設：probe 即刻完、乜都搵唔到 */
const noProbe: RecordingsProber = async () => [];

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

/** 用真 provider + 假 audio + 記憶體 router render 一個 page */
export const renderWithProviders = (ui: ReactElement, options: Options = {}) => {
    const { route = '/', path = '/', recordings = [] } = options;
    const audio = new FakeAudio();
    const { prober = noProbe } = options;
    const utils = render(
        <RecordingsProvider prober={prober} readStored={() => recordings}>
            <PlayerProvider audio={audio.asAudio()}>
                <MemoryRouter initialEntries={[route]}>
                    <Routes>
                        <Route path={path} element={ui} />
                        {options.extraRoutes?.map((r) => (
                            <Route key={r.path} path={r.path} element={r.element} />
                        ))}
                        <Route path="*" element={null} />
                    </Routes>
                    <LocationProbe />
                </MemoryRouter>
            </PlayerProvider>
        </RecordingsProvider>,
    );
    return { ...utils, audio };
};

/** renderHook 用：同 renderWithProviders 一樣嘅 provider，但唔包 Routes */
export const createHookWrapper = (
    recordings: Recording[] = [],
    prober: RecordingsProber = noProbe,
) => {
    const audio = new FakeAudio();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <RecordingsProvider prober={prober} readStored={() => recordings}>
            <PlayerProvider audio={audio.asAudio()}>
                <MemoryRouter>{children}</MemoryRouter>
            </PlayerProvider>
        </RecordingsProvider>
    );
    return { audio, wrapper };
};

export const recording = (showId: Recording['showId'], date: string, time = '2308'): Recording => ({
    showId,
    date,
    time,
    url: `https://audio.hkfm903.live/${showId}/${date.replaceAll('-', '')}_${time}.aac`,
});
