import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hasIcon } from '../../../tests/icons';
import { mockApi } from '../../../tests/renderApp';
import { MissingFolder } from './MissingFolder';

const setup = () => {
    const api = mockApi({
        'GET /api/folders/unmapped': () => ({ body: { folders: ['少爺占系列', '天使之戀系列'] } }),
        'POST /api/dramas/jim/folder': () => ({ body: { updatedAt: 'v2', findings: [] } }),
    });
    const onPaired = vi.fn(() => Promise.resolve());
    render(<MissingFolder dramaId="jim" folder="少爺占" etag='"v1"' onPaired={onPaired} />);
    return { api, onPaired };
};

const pairCalls = (api: ReturnType<typeof mockApi>) =>
    api.mock.calls.filter(([, init]) => init?.method === 'POST');

describe('MissingFolder', () => {
    it('should not pair when a folder is only picked (keyboard ↓ on the select)', async () => {
        const { api } = setup();
        const select = await screen.findByRole('combobox', { name: '選擇未配對的資料夾…' });
        await screen.findByRole('option', { name: '少爺占系列/' });
        fireEvent.change(select, { target: { value: '少爺占系列' } });
        expect(pairCalls(api)).toHaveLength(0);
    });

    it('should pair only after pressing 配對', async () => {
        const { api, onPaired } = setup();
        const pair = await screen.findByRole('button', { name: '配對' });
        expect(pair).toBeDisabled();
        await screen.findByRole('option', { name: '少爺占系列/' });
        await userEvent.selectOptions(screen.getByRole('combobox'), '少爺占系列');
        await userEvent.click(pair);
        await waitFor(() => expect(onPaired).toHaveBeenCalled());
        expect(JSON.parse(String(pairCalls(api)[0]?.[1]?.body))).toEqual({ folder: '少爺占系列' });
    });

    it('should show a link icon on 配對', async () => {
        setup();
        expect(hasIcon(await screen.findByRole('button', { name: '配對' }), 'link-2')).toBe(true);
    });
});
