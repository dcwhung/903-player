import { screen } from '@testing-library/react';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
import type { ChangesResponse } from '../../api/types';
import { AppearancePage } from './AppearancePage';

const changes = (over: Partial<ChangesResponse> = {}): ChangesResponse => ({
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 1 },
    warnings: [],
    bannerChanged: false,
    brandingChanged: false,
    ...over,
});

const show = (over: Partial<ChangesResponse> = {}) => {
    mockApi({
        'GET /api/branding': () => ({ body: { icon: null, text: null, updatedAt: null } }),
        'GET /api/banner': () => ({ body: { banner: null, updatedAt: null } }),
    });
    return renderAt(
        '/appearance',
        '/appearance',
        <AppearancePage />,
        fakeData({ changes: resource(changes(over)) }),
    );
};

describe('AppearancePage', () => {
    it('should show the three cards in order: icon, name/description, banner', async () => {
        show();
        const headings = await screen.findAllByRole('heading', { level: 2 });
        expect(headings.map((h) => h.textContent)).toEqual([
            'App 圖示',
            '名稱與簡介',
            '首頁 Banner',
        ]);
    });

    it('should mark the built-in icon and text with 內建預設 and disable 還原', async () => {
        show();
        expect(await screen.findByRole('button', { name: '還原 App 圖示' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '還原名稱與簡介' })).toBeDisabled();
        expect(screen.getAllByText('內建預設').length).toBeGreaterThanOrEqual(2);
    });

    it('should mark custom branding not yet published', async () => {
        show({ brandingChanged: true });
        const icon = {
            favicon: 'a.png',
            appleTouch: 'b.png',
            icon192: 'c.png',
            icon512: 'd.png',
            maskable: 'e.png',
            maskableBackground: '#0b0b0b',
        };
        mockApi({
            'GET /api/branding': () => ({
                body: { icon, text: { name: 'X', description: 'Y' }, updatedAt: 'z' },
            }),
            'GET /api/banner': () => ({ body: { banner: null, updatedAt: null } }),
        });
        renderAt(
            '/appearance',
            '/appearance',
            <AppearancePage />,
            fakeData({ changes: resource(changes({ brandingChanged: true })) }),
        );
        expect(await screen.findAllByText('自訂 · 未發佈')).toHaveProperty('length');
    });
});
