import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RecordingsProvider } from '../src/data/RecordingsProvider';
import { PlayerProvider } from '../src/player/PlayerProvider';
import type { Recording } from '../src/types/recording';
import { FakeAudio } from './fakeAudio';

interface Options {
    route?: string;
    path?: string;
    recordings?: Recording[];
    loader?: () => Promise<Recording[]>;
}

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

/** 用真 provider + 假 audio + 記憶體 router render 一個 page */
export const renderWithProviders = (ui: ReactElement, options: Options = {}) => {
    const { route = '/', path = '/', recordings = [] } = options;
    const audio = new FakeAudio();
    const loader = options.loader ?? (async () => recordings);
    const utils = render(
        <RecordingsProvider loader={loader}>
            <PlayerProvider audio={audio.asAudio()}>
                <MemoryRouter initialEntries={[route]}>
                    <Routes>
                        <Route path={path} element={ui} />
                        <Route path="*" element={null} />
                    </Routes>
                    <LocationProbe />
                </MemoryRouter>
            </PlayerProvider>
        </RecordingsProvider>,
    );
    return { ...utils, audio };
};

export const recording = (showId: Recording['showId'], date: string, time = '2308'): Recording => ({
    showId,
    date,
    time,
    url: `https://audio.hkfm903.live/${showId}/${date.replaceAll('-', '')}_${time}.aac`,
});
