import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, renderAt, resource } from '../../../tests/renderApp';
import type { ChangesResponse, TodoRow } from '../../api/types';
import { Stepper } from './Stepper';

const DONE = { state: 'done', target: '/dramas/lancy/arcs#love-after' } as const;
const READY: TodoRow = {
    key: 'newArc/lancy/love-after',
    publish: 'selectable',
    kind: 'newArc',
    findingIds: [1],
    dramaId: 'lancy',
    arcId: 'love-after',
    name: '蘭茜夫人劇場 · 戀愛後二分一',
    cells: { folder: DONE, id: DONE, images: DONE, schedule: DONE, summary: DONE },
};

const CHANGES: ChangesResponse = {
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 10 },
    appearance: { icon: false, text: false, banner: false },
    others: { items: [], timeline: [] },
};

/** changes = null → GET /api/changes 未載入 */
const data = (rows: TodoRow[], changes: ChangesResponse | null = CHANGES) =>
    fakeData({
        todos: resource({ rows, blocking: 0 }),
        changes: resource(changes ?? undefined),
    });

const step = (name: string) => within(screen.getByRole('list')).getByText(name).closest('li');

describe('Stepper', () => {
    it('should never link the automatic 掃描 R2 step', () => {
        renderAt('/publish', '/publish', <Stepper current={3} />, data([READY]));
        expect(within(step('掃描 R2（自動）') as HTMLElement).queryByRole('link')).toBeNull();
    });

    it('should mark the current step with aria-current and not link it', () => {
        renderAt('/', '/', <Stepper current={2} />, data([READY]));
        const current = step('處理待辦') as HTMLElement;
        expect(current).toHaveAttribute('aria-current', 'step');
        expect(within(current).queryByRole('link')).toBeNull();
    });

    it('should link 確認發佈 from 處理待辦 with the same selection as 下一步', async () => {
        renderAt('/', '/', <Stepper current={2} />, data([READY]));
        await userEvent.click(screen.getByRole('link', { name: /確認發佈/ }));
        const location = decodeURIComponent(screen.getByTestId('location').textContent ?? '');
        expect(location).toBe(
            '/publish?selection={"content":["newArc/lancy/love-after"],"branding":{"icon":false,"text":false},"banner":false}',
        );
    });

    it.each([
        ['nothing is picked', data([])],
        ['GET /api/changes has not loaded', data([READY], null)],
    ])('should not link 確認發佈 when %s, like 下一步', (_, adminData) => {
        renderAt('/', '/', <Stepper current={2} />, adminData);
        expect(screen.queryByRole('link', { name: /確認發佈/ })).toBeNull();
    });

    it('should link 處理待辦 back to the todo page from 確認發佈', async () => {
        renderAt('/publish?selection=x', '/publish', <Stepper current={3} />, data([READY]));
        expect(step('確認發佈')).toHaveAttribute('aria-current', 'step');
        expect(screen.queryByRole('link', { name: /確認發佈/ })).toBeNull();
        await userEvent.click(screen.getByRole('link', { name: /處理待辦/ }));
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    });
});
