import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import { stubViewport } from '../../../tests/landscape';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { HomeAwayObserver } from '../../hooks/homeReturn';
import { openHomePlayerCard } from '../../hooks/homePlayerCardClosed';
import { restoreMiniPlayer } from '../../hooks/miniPlayerDismissed';
import { t } from '../../i18n/t';
import { usePlayer } from '../../player/usePlayer';
import type { Track } from '../../types/track';
import { HomePage } from './HomePage';

/*
 * HomeView 由內頁返主頁（P10 v2.0.1 用戶反饋，截圖 25 → 26）：播緊嘢返主頁直接見主頁選單 + 右邊把手，
 * 播放卡收埋（唔停播），撳把手先出返張卡（27）。第一次開 app（冇去過內頁）照舊出張卡；
 * Duo 打開・橫唔變（返主頁照舊出張卡）
 */
const DUO_OPEN_LANDSCAPE = { width: 876, height: 612 };
const HOME_VIEW = { width: 544, height: 544 };
const SHOW_CARD = '正在播放（今日節目）';
const BADGIRL = 'Bad Girl大過佬';

const BADGIRL_TODAY = recording('badgirl', '2026-10-19', '1000');
const RECORDINGS = [recording('badgirl', '2026-10-16', '1000'), BADGIRL_TODAY];

/** 內頁（App 嘅 HomeAwayObserver 記低去過主頁以外）：播完返主頁 */
const InnerPage = ({ target }: { target: Track }) => {
    const { load } = usePlayer();
    const navigate = useNavigate();
    return (
        <>
            <HomeAwayObserver />
            <button
                type="button"
                onClick={async () => {
                    await load(target, { autoplay: true });
                    navigate('/');
                }}
            >
                play then home
            </button>
        </>
    );
};

const returnHomePlaying = async () => {
    renderWithProviders(<HomePage />, {
        route: '/show/badgirl',
        recordings: RECORDINGS,
        extraRoutes: [{ path: '/show/badgirl', element: <InnerPage target={BADGIRL_TODAY} /> }],
    });
    await userEvent.click(screen.getByRole('button', { name: 'play then home' }));
    await screen.findByRole('main');
};

const setUp = (viewport: { width: number; height: number }) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-19T08:00:00Z')); // 香港 19/10 16:00
    stubViewport(viewport);
};

const tearDown = () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    openHomePlayerCard();
    restoreMiniPlayer();
};

describe('HomePage on HomeView returning from an inner page', () => {
    beforeEach(() => setUp(HOME_VIEW));
    afterEach(tearDown);

    it('should land on the full-width grid with the handle, not the player card', async () => {
        await returnHomePlaying();

        expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'fillWithHandle');
        expect(screen.queryByRole('region', { name: SHOW_CARD })).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: t('homeCard.reopenPlaying', { name: BADGIRL }) }),
        ).toBeInTheDocument();
    });

    it('should keep playing while the card is folded away', async () => {
        await returnHomePlaying();

        expect(screen.getByRole('button', { name: /^播放中：/ })).toHaveTextContent(
            t('common.status.playing'),
        );
    });

    it('should open the player card from the handle', async () => {
        await returnHomePlaying();

        await userEvent.click(screen.getByRole('button', { name: /打開播放器$/ }));

        expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'split');
        expect(screen.getByRole('region', { name: SHOW_CARD })).toBeInTheDocument();
    });
});

describe('HomePage on Duo open landscape returning from an inner page', () => {
    beforeEach(() => setUp(DUO_OPEN_LANDSCAPE));
    afterEach(tearDown);

    it('should still show the player card', async () => {
        await returnHomePlaying();

        expect(screen.getByRole('main')).toHaveAttribute('data-layout', 'split');
        expect(screen.getByRole('region', { name: SHOW_CARD })).toBeInTheDocument();
    });
});
