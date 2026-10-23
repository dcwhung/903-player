import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../tests/renderWithProviders';
import { seriesEpisodesOf } from '../data/dramaCatalog';
import { saveProgress } from '../services/progressStore';
import { DramaPage } from './DramaPage';

const PATH = '/drama/:dramaId';
const CHISEE = seriesEpisodesOf('chisee');
const XMAS = CHISEE.filter((e) => e.arc === 'Ｘ時mas時小提議');

const openDrama = (id: string) =>
    renderWithProviders(<DramaPage />, { route: `/drama/${id}`, path: PATH });
const arcChips = () => within(screen.getByRole('group', { name: '短篇' })).getAllByRole('button');

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
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('芝See菇Bi Family');
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
            const group = screen.getByRole('group', { name: '短篇' }).parentElement as HTMLElement;
            expect(within(group).getByText('連線中…')).toBeInTheDocument();
            act(() => audio.emitMetadata(1200));
            // 「全部」+ 10 個短篇
            expect(arcChips()).toHaveLength(11);
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

    it('plays the next episode by itself when one finishes, and the list follows', async () => {
        const { audio } = openDrama('chisee');
        await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
        act(() => audio.emitMetadata(1200));

        act(() => audio.end());

        await waitFor(() => expect(audio.src).toBe(CHISEE[1]?.url));
        const rows = within(screen.getByRole('region', { name: '集數' })).getAllByRole('button');
        expect(rows[0]).toHaveAccessibleName('播放 第 1 集，已收聽');
        expect(rows[1]).toHaveAttribute('aria-current', 'true');
    });

    describe('全部短篇 overview', () => {
        const BIRTHDAY = CHISEE.filter((e) => e.arc === '你生日所以我生日');
        const FRIENDS = CHISEE.filter((e) => e.arc === '好朋友手牽手');

        it('lists every 短篇 with finished ones last, and plays one from its row button', async () => {
            BIRTHDAY.forEach((e) => saveProgress(e.url, 990, 1000));
            saveProgress(FRIENDS[0]?.url ?? '', 990, 1000);
            vi.setSystemTime(new Date('2026-10-23T08:05:00Z')); // 最近聽緊嘅係好朋友手牽手第 2 集
            saveProgress(FRIENDS[1]?.url ?? '', 400, 1000);
            const { audio } = openDrama('chisee');
            await waitFor(() => expect(audio.src).toBe(FRIENDS[1]?.url));

            await userEvent.click(screen.getByRole('button', { name: '全部短篇（10 個）' }));

            const dialog = screen.getByRole('dialog', { name: '全部短篇' });
            const picks = within(dialog)
                .getAllByRole('button')
                .filter((b) => b.dataset.role === 'pick');
            expect(picks).toHaveLength(10);
            expect(picks[0]).toHaveAccessibleName('大妒忌，未聽 · 3 集');
            expect(picks.at(-1)).toHaveAccessibleName('你生日所以我生日，聽完 · 3 集');
            expect(within(dialog).getByText('聽完 1 / 10 個')).toBeInTheDocument();

            await userEvent.click(
                within(dialog).getByRole('button', { name: '播放 大妒忌 第 1 集' }),
            );

            const DAJEALOUS = CHISEE.find((e) => e.arc === '大妒忌' && e.no === 1);
            await waitFor(() => expect(audio.src).toBe(DAJEALOUS?.url));
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: '大妒忌' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
        });

        it('switches the list to a 短篇 picked by its row, without changing playback', async () => {
            const { audio } = openDrama('chisee');
            await waitFor(() => expect(audio.src).toBe(CHISEE[0]?.url));
            await userEvent.click(screen.getByRole('button', { name: '全部短篇（10 個）' }));

            await userEvent.click(screen.getByRole('button', { name: '青春期，未聽 · 4 集' }));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: '青春期' })).toHaveAttribute(
                'aria-pressed',
                'true',
            );
            expect(audio.src).toBe(CHISEE[0]?.url);
        });
    });

    it('treats the disabled 18 樓 C 座 as not found', () => {
        const { audio } = openDrama('c18');

        expect(screen.getByText('找不到此廣播劇')).toBeInTheDocument();
        expect(audio.src).toBe('');
    });

    it('says the drama cannot be found for an unknown id', () => {
        openDrama('nope');

        expect(screen.getByText('找不到此廣播劇')).toBeInTheDocument();
    });
});
