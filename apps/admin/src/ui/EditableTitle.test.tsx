import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableTitle } from './EditableTitle';

describe('EditableTitle', () => {
    it('should rename on double-click + Enter', async () => {
        const onSave = vi.fn();
        render(<EditableTitle value="口水多過浪花" onSave={onSave} />);
        await userEvent.dblClick(screen.getByText('口水多過浪花'));
        const input = screen.getByRole('textbox', { name: '名稱' });
        await userEvent.clear(input);
        await userEvent.type(input, '新名稱{Enter}');
        expect(onSave).toHaveBeenCalledWith('新名稱');
    });

    it('should cancel with Escape', async () => {
        const onSave = vi.fn();
        render(<EditableTitle value="口水多過浪花" onSave={onSave} />);
        await userEvent.dblClick(screen.getByText('口水多過浪花'));
        await userEvent.type(screen.getByRole('textbox', { name: '名稱' }), 'x{Escape}');
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByText('口水多過浪花')).toBeInTheDocument();
    });
});
