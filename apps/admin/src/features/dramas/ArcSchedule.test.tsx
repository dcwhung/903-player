import { render, screen } from '@testing-library/react';
import { hasIcon } from '../../../tests/icons';
import { ScheduleSaveBar } from './ScheduleBars';

describe('ScheduleSaveBar', () => {
    it('should label the delete button 刪除 with a trash icon', () => {
        render(
            <ScheduleSaveBar
                canDelete
                canRevert={false}
                canSave={false}
                fromTodos={false}
                saving={false}
                onDelete={() => {}}
                onRevert={() => {}}
                onSave={() => {}}
            />,
        );
        const remove = screen.getByRole('button', { name: /^刪除/ });
        expect(remove).toHaveTextContent(/^刪除$/);
        expect(hasIcon(remove, 'trash-2')).toBe(true);
        expect(hasIcon(screen.getByRole('button', { name: '儲存' }), 'save')).toBe(true);
    });
});
