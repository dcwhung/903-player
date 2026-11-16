import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Drama } from '@903-player/catalog';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { dailyEpisodesOf } from '../../catalog/dramas';
import { saveProgress } from '../../services/progressStore';
import { DramaPage } from './DramaPage';

// 18 樓 C 座暫時停用：當佢開咗，再加示範簡介（真 catalog 未有）
vi.mock('../../catalog/dramas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/dramas')>();
    const withSummary = (drama: Drama | undefined): Drama | undefined =>
        drama && { ...drama, summary: '每日劇示範簡介' };
    return { ...actual, findEnabledDrama: (id: string) => withSummary(actual.findDrama(id)) };
});

const C18 = dailyEpisodesOf('c18');
const openC18 = () =>
    renderWithProviders(<DramaPage />, { route: '/drama/c18', path: '/drama/:dramaId' });

describe('DailyDramaPage item info（P9.5 #12）', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => vi.useRealTimers());

    it('should pop the drama info sheet on a first visit', async () => {
        openC18();
        const sheet = await screen.findByRole('dialog', { name: '劇集資料' });
        expect(within(sheet).getByText('每日劇示範簡介')).toBeInTheDocument();
    });

    it('should not pop it when entered from 我的收藏 (focusId)', async () => {
        renderWithProviders(<DramaPage />, {
            route: '/drama/c18',
            path: '/drama/:dramaId',
            state: { focusId: C18[0]?.id },
        });
        await screen.findByRole('button', { name: '劇集資料' });
        await act(async () => {});
        expect(screen.queryByRole('dialog', { name: '劇集資料' })).not.toBeInTheDocument();
    });

    it('should not pop it with progress, but open it from ⓘ', async () => {
        saveProgress(C18[0]?.id ?? '', 60, 600);
        openC18();
        await screen.findByRole('button', { name: '劇集資料' });
        await act(async () => {});
        expect(screen.queryByRole('dialog', { name: '劇集資料' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: '劇集資料' }));
        expect(await screen.findByRole('dialog', { name: '劇集資料' })).toBeInTheDocument();
    });
});
