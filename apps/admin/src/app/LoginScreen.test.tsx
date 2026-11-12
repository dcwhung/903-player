import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import googleG from '../assets/svg/logos/google-g.svg?raw';
import { LoginScreen } from './LoginScreen';

const renderAt = (url: string) =>
    render(
        <MemoryRouter initialEntries={[url]}>
            <LoginScreen />
        </MemoryRouter>,
    );

/** Google 官方四色 G（藍綠黃紅） */
const G_COLOURS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];

describe('LoginScreen', () => {
    it('should send the current deep link to /auth/google/start (S-809)', () => {
        renderAt('/dramas/lancy/schedule#lancy-02');
        expect(screen.getByRole('link', { name: '使用 Google 登入' })).toHaveAttribute(
            'href',
            '/auth/google/start?next=%2Fdramas%2Flancy%2Fschedule%23lancy-02',
        );
    });

    it('should show the title, one line of help and the version pill on the banner', () => {
        renderAt('/');
        expect(screen.getByRole('heading', { level: 1, name: '管理介面登入' })).toBeInTheDocument();
        expect(screen.getByText('僅限獲授權的 Google 帳戶登入。')).toBeInTheDocument();
        expect(screen.getByText(/^Admin v/)).toBeInTheDocument();
    });

    it('should render the official Sign in with Google button with the four-colour G', () => {
        renderAt('/');
        const google = screen.getByRole('link', { name: '使用 Google 登入' });
        expect(google).toHaveClass('gsi');
        // S-833：G 係 asset 檔（src/assets/svg/logos/），<img alt=""> 純裝飾
        expect(google.querySelector('svg')).toBeNull();
        const logo = google.querySelector('img');
        expect(logo).toHaveAttribute('alt', '');
        expect(logo?.getAttribute('src')).toMatch(/google-g\.svg$/);
        const fills = [...googleG.matchAll(/fill="(#[0-9a-f]{6})"/gi)].map((m) =>
            m[1]?.toUpperCase(),
        );
        expect(fills.sort()).toEqual([...G_COLOURS].sort());
    });

    it('should put the banner behind the card as a decorative background', () => {
        const { container } = renderAt('/');
        const bg = container.querySelector('.login-bg');
        expect(bg).toHaveAttribute('aria-hidden', 'true');
        expect((bg as HTMLElement).style.backgroundImage).toContain('/banner.webp');
    });
});
