import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { recording, renderWithProviders } from '../../tests/renderWithProviders';
import { HOME_THEME, SHOW_THEMES } from '../config/showThemes';
import { HomePage } from './HomePage';
import { ShowPage } from './ShowPage';

const RECORDINGS = [recording('gongzi', '2026-10-17'), recording('badgirl', '2026-10-19', '1000')];

const themeColor = () =>
    document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;

describe('theme-color across pages', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-19T08:00:00Z'));
        Element.prototype.scrollIntoView = vi.fn();
        // 模擬 index.html 嘅初始值（啟動色）
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = HOME_THEME.bg;
        document.head.append(meta);
    });
    afterEach(() => {
        vi.useRealTimers();
        document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
    });

    it('should end on the right colour after home → show → home', async () => {
        renderWithProviders(<HomePage />, {
            recordings: RECORDINGS,
            extraRoutes: [{ path: '/show/:showId', element: <ShowPage /> }],
        });
        await screen.findByRole('navigation');
        expect(themeColor()).toBe(HOME_THEME.bg);

        await userEvent.click(screen.getByRole('button', { name: '公子會' }));
        await screen.findByRole('heading', { name: '公子會' });
        expect(themeColor()).toBe(SHOW_THEMES.gongzi.bg);

        await userEvent.click(screen.getByRole('button', { name: '返回主頁' }));
        await screen.findByRole('navigation');
        expect(themeColor()).toBe(HOME_THEME.bg);
        expect(document.head.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    });
});
