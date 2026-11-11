import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hasIcon } from '../../tests/icons';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
    it('should focus cancel, trap Tab and cancel on Escape', async () => {
        const onCancel = vi.fn();
        render(
            <ConfirmDialog
                title="刪除「新劇」？"
                body="此劇集從未發佈"
                confirmLabel="刪除"
                danger
                onConfirm={() => {}}
                onCancel={onCancel}
            />,
        );
        expect(screen.getByRole('dialog', { name: '刪除「新劇」？' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole('button', { name: '刪除' })).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
        await userEvent.keyboard('{Escape}');
        expect(onCancel).toHaveBeenCalled();
    });

    it('should show an X icon on cancel', () => {
        render(
            <ConfirmDialog
                title="還原？"
                body="b"
                confirmLabel="還原"
                onConfirm={() => {}}
                onCancel={() => {}}
            />,
        );
        expect(hasIcon(screen.getByRole('button', { name: '取消' }), 'x')).toBe(true);
    });
});
