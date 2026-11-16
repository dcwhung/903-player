import { render, screen } from '@testing-library/react';
import { CardHead } from './AppearanceParts';

const head = (canRestore: boolean, mainDisabled = false) => (
    <>
        <CardHead
            title="首頁 Banner"
            status={null}
            restoreLabel="還原首頁 Banner"
            canRestore={canRestore}
            onRestore={() => undefined}
        >
            <button type="button" disabled={mainDisabled}>
                更換
            </button>
        </CardHead>
        <input aria-label="其他" />
    </>
);

describe('CardHead focus when 還原 hides (S-1013)', () => {
    it('should move lost focus to the main button', () => {
        const view = render(head(true));
        screen.getByRole('button', { name: '還原首頁 Banner' }).focus();
        view.rerender(head(false));
        expect(screen.getByRole('button', { name: '更換' })).toHaveFocus();
    });

    it('should move lost focus to the title when the main button is disabled', () => {
        const view = render(head(true, true));
        screen.getByRole('button', { name: '還原首頁 Banner' }).focus();
        view.rerender(head(false, true));
        const title = screen.getByRole('heading', { name: '首頁 Banner' });
        expect(title).toHaveFocus();
        expect(title).toHaveAttribute('tabindex', '-1');
    });

    it('should leave focus alone when it is still on the page', () => {
        const view = render(head(true));
        screen.getByLabelText('其他').focus();
        view.rerender(head(false));
        expect(screen.getByLabelText('其他')).toHaveFocus();
    });

    it('should not take focus when 還原 was never shown', () => {
        const view = render(head(false));
        view.rerender(head(false));
        expect(document.body).toHaveFocus();
    });
});
