/* 劇集頁舊 URL：已下架 → 返主頁 + Toast；即將上架 → 返主頁（P8 #6，_mockups_/coming-soon ⑦ ⑧） */
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../tests/renderWithProviders';
import { Toast } from '../../components/shared/common/Toast/Toast';
import { DramaPage } from './DramaPage';

const STATUS: Record<string, string> = { chisee: 'removed', jim: 'upcoming' };

vi.mock('../../catalog/dramas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../catalog/dramas')>();
    return {
        ...actual,
        dramaStatus: (id: string, today?: string) => STATUS[id] ?? actual.dramaStatus(id, today),
    };
});

/** 主頁 route 只放提示（真 app 嘅 Toast 喺 routes 外面，一直都喺度） */
const open = (id: string) =>
    renderWithProviders(<DramaPage />, {
        route: `/drama/${id}`,
        path: '/drama/:dramaId',
        extraRoutes: [{ path: '/', element: <Toast /> }],
    });

describe('DramaPage for a drama off the shelf', () => {
    // 提示係全 app 共用（module state），先測冇提示嗰個
    it('should go home quietly for a drama not released yet', () => {
        open('jim');

        expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
        expect(screen.getByRole('status')).toHaveTextContent('');
    });

    it('should go home and say the drama was removed', () => {
        open('chisee');

        expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
        expect(screen.getByRole('status')).toHaveTextContent('呢套劇已下架');
    });
});
