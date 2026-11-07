import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubWideLandscape } from '../../../tests/landscape';
import { openWhileOtherLoaded } from '../../../tests/otherPlayback';
import { recording, renderWithProviders } from '../../../tests/renderWithProviders';
import { dailyEpisodesOf } from '../../catalog/dramas';
import { DramaPage } from './DramaPage';

// 18 樓 C 座暫時停用（config/dramas.ts enabled: false）；每日劇集頁照測，當佢開咗
vi.mock('../../catalog/dramas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/dramas')>();
    return { ...actual, findEnabledDrama: actual.findDrama };
});

const C18 = dailyEpisodesOf('c18');
const openDrama = (id: string) =>
    renderWithProviders(<DramaPage />, { route: `/drama/${id}`, path: '/drama/:dramaId' });

describe('DramaPage (daily drama, once enabled)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z')); // 香港 23/10（五）16:00
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => vi.useRealTimers());

    describe('daily drama', () => {
        // P7 #7：收藏 tab 撳行入嚟（focusUrl）：唔自動播，捲去嗰集、highlight
        it('should not autoplay and should highlight the episode opened from 我的收藏', async () => {
            const target = C18[3];
            const { audio, container } = renderWithProviders(<DramaPage />, {
                route: '/drama/c18',
                path: '/drama/:dramaId',
                state: { focusUrl: target?.url },
            });

            await screen.findByRole('region', { name: '集數' });
            expect(audio.play).not.toHaveBeenCalled();
            expect(audio.src).toBe('');
            expect(container.querySelector('li[data-focused]')).toHaveAttribute(
                'data-episode-key',
                target?.url,
            );

            // 撳播放掣播收藏嗰集（唔係今日嗰集）
            await userEvent.click(screen.getByRole('button', { name: '播放' }));
            await waitFor(() => expect(audio.src).toBe(target?.url));
        });

        it('autoplays today’s episode and lists every episode newest first, tagging reruns', async () => {
            const { audio } = openDrama('c18');

            await waitFor(() => expect(audio.src).toBe(C18[0]?.url));
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('18 樓 C 座');
            // 每行之外仲有收藏掣（P7 #7）：淨係數播放 / 暫停嗰粒
            const rows = within(screen.getByRole('region', { name: '集數' })).getAllByRole(
                'button',
                { name: /^(播放|暫停) / },
            );
            expect(rows).toHaveLength(C18.length);
            expect(rows[0]).toHaveAccessibleName('暫停 23/10 星期五，連線中…');
            expect(rows.at(-1)).toHaveAccessibleName('播放 11/08 星期一 重溫，未收聽');
        });

        it('leaves other playback alone, starting today’s episode only when play is pressed', async () => {
            const other = recording('gongzi', '2026-10-17');
            const { audio } = await openWhileOtherLoaded(<DramaPage />, other, {
                route: '/drama/c18',
                path: '/drama/:dramaId',
            });
            const plays = audio.play.mock.calls.length;

            await screen.findByRole('heading', { level: 1 });
            expect(audio.src).toBe(other.url);
            expect(audio.play).toHaveBeenCalledTimes(plays);

            await userEvent.click(screen.getByRole('button', { name: '播放' }));

            expect(audio.src).toBe(C18[0]?.url);
        });

        it('lines up only the days with an episode in the date strip', async () => {
            const { audio } = openDrama('c18');
            await waitFor(() => expect(audio.src).toBe(C18[0]?.url));

            await userEvent.click(screen.getByRole('button', { name: '轉去 22/10 星期四' }));

            await waitFor(() => expect(audio.src).toBe(C18[1]?.url));
            // 16/10 之後就係重播嘅 13/08：中間冇成年灰色日子
            await userEvent.click(screen.getByRole('button', { name: /^播放 15\/10/ }));
            expect(screen.getByRole('button', { name: '轉去 13/08 星期三' })).toBeInTheDocument();
        });
    });
    it('should show a right-edge handle for another show playing on a wide landscape screen', async () => {
        stubWideLandscape();
        await openWhileOtherLoaded(<DramaPage />, recording('gongzi', '2026-10-17'), {
            route: '/drama/c18',
            path: '/drama/:dramaId',
        });

        const handle = await screen.findByRole('button', { name: '播放中：公子會，返回主頁' });
        expect(screen.getByRole('main')).toContainElement(handle);
        vi.unstubAllGlobals();
    });
});
