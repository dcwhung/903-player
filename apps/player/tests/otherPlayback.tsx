import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../src/player/usePlayer';
import type { Recording } from '../src/types/recording';
import type { Track } from '../src/types/track';
import { renderWithProviders } from './renderWithProviders';

const ELSEWHERE = '/elsewhere';
const LOAD_THEN_OPEN = 'load other then open';

/** 喺其他頁載入咗另一樣嘢（playing = 播緊，否則淨係載入、暫停緊），再轉去 to */
const LoadThenOpen = ({ track, playing, to }: { track: Track; playing: boolean; to: string }) => {
    const { load } = usePlayer();
    const navigate = useNavigate();
    return (
        <button
            type="button"
            onClick={async () => {
                await load(track, { autoplay: playing });
                navigate(to);
            }}
        >
            {LOAD_THEN_OPEN}
        </button>
    );
};

interface OpenOptions {
    route: string;
    path: string;
    recordings?: Recording[];
    playing?: boolean;
}

/** 入頁之前 player 已經載入咗 other（mini player 顯示緊，播緊或者暫停緊） */
export const openWhileOtherLoaded = async (
    page: ReactElement,
    other: Track,
    { route, path, recordings, playing = true }: OpenOptions,
) => {
    const rendered = renderWithProviders(page, {
        route: ELSEWHERE,
        path,
        ...(recordings && { recordings }),
        extraRoutes: [
            {
                path: ELSEWHERE,
                element: <LoadThenOpen track={other} playing={playing} to={route} />,
            },
        ],
    });
    await userEvent.click(screen.getByRole('button', { name: LOAD_THEN_OPEN }));
    return rendered;
};
