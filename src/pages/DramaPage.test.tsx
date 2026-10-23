import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../tests/renderWithProviders';
import { dailyEpisodesOf, seriesEpisodesOf } from '../data/dramaCatalog';
import { saveProgress } from '../services/progressStore';
import { DramaPage } from './DramaPage';

const PATH = '/drama/:dramaId';
const CHISEE = seriesEpisodesOf('chisee');
const XMAS = CHISEE.filter((e) => e.arc === 'Ｘ時mas時小提議');
const C18 = dailyEpisodesOf('c18');

const openDrama = (id: string) =>
    renderWithProviders(<DramaPage />, { route: `/drama/${id}`, path: PATH });
const arcChips = () => within(screen.getByRole('group', { name: '主題' })).getAllByRole('button');

describe('DramaPage', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-23T08:00:00Z')); // 香港 23/10（五）16:00
        Element.prototype.scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollTo = vi.fn();
    });
    afterEach(() => vi.useRealTimers());

    describe('series drama', () => {
        it('autoplays the first episode on a light themed page with the drama name as title', async () => {
            const { audio } = openDrama('chisee');

            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
            expect(audio.play).toHaveBeenCalled();
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
                '芝-See-菇-Bi-Family',
            );
            expect(screen.getByRole('main').closest('[data-theme-scope]')).toHaveAttribute(
                'data-scheme',
                'light',
            );
        });

        it('resumes the last episode and lists only its arc, with the arc chip pressed', async () => {
            saveProgress(XMAS[1]?.url ?? '', 120, 1200);
            const { audio } = openDrama('chisee');

            await waitFor(() => expect(audio.src).toBe(XMAS[1]?.url));
            // 未讀到時長：標籤同節目頁日子條一樣講「連線中…」
            const group = screen.getByRole('group', { name: '主題' }).parentElement as HTMLElement;
            expect(within(group).getByText('連線中…')).toBeInTheDocument();
            act(() => audio.emitMetadata(1200));
            expect(arcChips()).toHaveLength(10);
            expect(screen.getByRole('button', { name: 'Ｘ時mas時小提議' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
            expect(screen.getByText('現正播放：第 2 集 哥哥你洽我')).toBeInTheDocument();
            const rows = within(screen.getByRole('region', { name: '集數' })).getAllByRole(
                'button',
            );
            expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
                '播放 不如休養下 第 1 集，未收聽',
                '暫停 哥哥你洽我 第 2 集，播放中 · 2:00 / 20:00',
                '播放 著襪索腳汗 第 3 集，未收聽',
                '播放 認認真真搵返個人 第 4 集，未收聽',
            ]);
        });

        it('switches the list to another arc without interrupting playback, then plays a tapped episode', async () => {
            const { audio } = openDrama('chisee');
            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));

            await userEvent.click(screen.getByRole('button', { name: 'Ｘ時mas時小提議' }));

            expect(audio.src).toBe(CHISEE[0]?.url);
            const list = screen.getByRole('region', { name: '集數' });
            expect(within(list).getAllByRole('button')).toHaveLength(4);
            await userEvent.click(within(list).getByRole('button', { name: /索腳汗/ }));
            await waitFor(() => expect(audio.src).toBe(XMAS[2]?.url));
        });
    });

    describe('daily drama', () => {
        it('autoplays today’s episode and lists every episode newest first, tagging reruns', async () => {
            const { audio } = openDrama('c18');

            await waitFor(() => expect(audio.src).toBe(C18[0]?.url));
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('18-樓-C-座');
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

    it('says the drama cannot be found for an unknown id', () => {
        openDrama('nope');

        expect(screen.getByText('找不到此廣播劇')).toBeInTheDocument();
    });
});
