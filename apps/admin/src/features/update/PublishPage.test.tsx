import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fakeData, renderAt, resource } from '../../../tests/renderApp';
import type { ChangesResponse, PublishWarning } from '../../api/types';
import { PublishPage } from './PublishPage';

const WARNINGS: PublishWarning[] = [
    { kind: 'neutralTheme', target: 'dramas/fresh' },
    {
        kind: 'contrast',
        target: 'dramas/lancy',
        foreground: 'muted',
        background: 'surface',
        ratio: 3.9,
        minimum: 4.5,
    },
];

const changesOf = (over: Partial<ChangesResponse> = {}): ChangesResponse => ({
    base: 1,
    changes: { items: [], timeline: [] },
    validation: { ok: true, episodeCount: 10 },
    warnings: [],
    bannerChanged: false,
    ...over,
});

const show = (changes: ChangesResponse) =>
    renderAt('/publish', '/publish', <PublishPage />, fakeData({ changes: resource(changes) }));

describe('PublishPage', () => {
    it('should fold warnings into one summary line that still lets you publish', async () => {
        show(changesOf({ warnings: WARNINGS, bannerChanged: true }));
        expect(screen.getByText('2 項配色對比度警告（不影響發佈）')).toBeInTheDocument();
        expect(screen.queryByRole('list', { name: '配色警告' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '發佈' })).toBeEnabled();
        await userEvent.click(screen.getByRole('button', { name: '展開' }));
        const list = screen.getByRole('list', { name: '配色警告' });
        expect(within(list).getByText(/fresh：未設定配色，現正使用中性灰/)).toBeInTheDocument();
        expect(within(list).getByRole('link', { name: '前往選擇' })).toHaveAttribute(
            'href',
            '/dramas/fresh/theme',
        );
        expect(within(list).getByRole('link', { name: '前往修改' })).toBeInTheDocument();
    });

    it('should expand every warning next to a validation error', () => {
        show(
            changesOf({
                warnings: WARNINGS,
                validation: { ok: false, error: '首頁 Banner 不完整' },
                changes: { items: [], timeline: [] },
            }),
        );
        expect(screen.getByRole('list', { name: '配色警告' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '展開' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '發佈' })).toBeDisabled();
    });

    it('should count a banner-only change as something to publish', () => {
        show(changesOf({ bannerChanged: true }));
        expect(screen.getByText('首頁 Banner 已更改')).toBeInTheDocument();
        expect(screen.getByText('本次只更改首頁 Banner。')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '發佈' })).toBeEnabled();
    });

    it('should keep 發佈 disabled when nothing changed', () => {
        show(changesOf());
        expect(screen.getByRole('button', { name: '發佈' })).toBeDisabled();
    });
});
