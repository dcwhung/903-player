import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, mockApi, renderAt, resource } from '../../../tests/renderApp';
import type { ChangesResponse } from '../../api/types';
import { TextCard } from './TextCard';

const changesRes: ChangesResponse = {
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 1 },
    warnings: [],
    brandingChanged: false,
};

const show = () =>
    renderAt(
        '/appearance',
        '/appearance',
        <TextCard />,
        fakeData({ changes: resource(changesRes) }),
    );

describe('TextCard', () => {
    it('should confirm before saving a changed app name, then PUT the text', async () => {
        const bodies: unknown[] = [];
        mockApi({
            'GET /api/branding': () => ({ body: { icon: null, text: null, updatedAt: null } }),
            'PUT /api/branding/text': (init) => {
                bodies.push(JSON.parse(String(init.body)));
                return { body: { icon: null, text: null, updatedAt: 'x' } };
            },
        });
        show();
        const name = await screen.findByLabelText('App 名');
        await userEvent.clear(name);
        await userEvent.type(name, '叱咤 Player');
        await userEvent.click(screen.getByRole('button', { name: '儲存名稱與簡介' }));
        const dialog = screen.getByRole('dialog', { name: '更改 App 名？' });
        expect(dialog).toHaveTextContent('已安裝的 App 名稱及分享預覽均會改為「叱咤 Player」');
        await userEvent.click(within(dialog).getByRole('button', { name: '儲存' }));
        await waitFor(() => expect(bodies.length).toBe(1));
        expect(bodies[0]).toMatchObject({ name: '叱咤 Player' });
    });

    it('should save a description-only change without confirming', async () => {
        const bodies: unknown[] = [];
        mockApi({
            'GET /api/branding': () => ({ body: { icon: null, text: null, updatedAt: null } }),
            'PUT /api/branding/text': (init) => {
                bodies.push(JSON.parse(String(init.body)));
                return { body: { icon: null, text: null, updatedAt: 'x' } };
            },
        });
        show();
        const desc = await screen.findByLabelText('簡介');
        await userEvent.type(desc, '！');
        await userEvent.click(screen.getByRole('button', { name: '儲存名稱與簡介' }));
        await waitFor(() => expect(bodies.length).toBe(1));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should warn when the short name is longer than 12 characters', async () => {
        mockApi({
            'GET /api/branding': () => ({ body: { icon: null, text: null, updatedAt: null } }),
        });
        show();
        const short = await screen.findByLabelText('短名');
        await userEvent.clear(short);
        await userEvent.type(short, 'abcdefghijklmno');
        expect(screen.getByText('15 個字元，主畫面可能會截斷')).toBeInTheDocument();
    });

    it('should restore the built-in text only after confirming', async () => {
        const deleted = vi.fn(() => ({}));
        mockApi({
            'GET /api/branding': () => ({
                body: { icon: null, text: { name: 'X', description: 'Y' }, updatedAt: 'z' },
            }),
            'DELETE /api/branding/text': deleted,
        });
        show();
        await userEvent.click(await screen.findByRole('button', { name: '還原名稱與簡介' }));
        const dialog = screen.getByRole('dialog', { name: '還原名稱與簡介？' });
        await userEvent.click(within(dialog).getByRole('button', { name: '還原' }));
        await waitFor(() => expect(deleted).toHaveBeenCalledOnce());
    });
});
