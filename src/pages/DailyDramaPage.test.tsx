import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../tests/renderWithProviders';
import { dailyEpisodesOf } from '../dramas';
import { DramaPage } from './DramaPage';

// 18 樓 C 座暫時停用（config/dramas.ts enabled: false）；每日劇集頁照測，當佢開咗
vi.mock('../dramas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../dramas')>();
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
        it('autoplays today’s episode and lists every episode newest first, tagging reruns', async () => {
            const { audio } = openDrama('c18');

            await waitFor(() => expect(audio.src).toBe(C18[0]?.url));
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('18 樓 C 座');
            const rows = within(screen.getByRole('region', { name: '集數' })).getAllByRole(
                'button',
            );
            expect(rows).toHaveLength(C18.length);
            expect(rows[0]).toHaveAccessibleName('暫停 23/10 星期五，連線中…');
            expect(rows.at(-1)).toHaveAccessibleName('播放 11/08 星期一 重溫，未收聽');
        });

        it('lines up only the days with an episode in the date strip', async () => {
            const { audio } = openDrama('c18');
            await waitFor(() => expect(audio.src).toBe(C18[0]?.url));

            await userEvent.click(screen.getByRole('button', { name: '轉去 22/10（四）' }));

            await waitFor(() => expect(audio.src).toBe(C18[1]?.url));
            // 16/10 之後就係重播嘅 13/08：中間冇成年灰色日子
            await userEvent.click(screen.getByRole('button', { name: /^播放 15\/10/ }));
            expect(screen.getByRole('button', { name: '轉去 13/08（三）' })).toBeInTheDocument();
        });
    });
});
