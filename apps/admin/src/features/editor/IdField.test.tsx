import { render, screen } from '@testing-library/react';
import { IdField } from './IdField';

describe('IdField', () => {
    it('should show the 422-style field error next to an invalid ID', () => {
        render(<IdField label="短篇 ID" value="Heart Arc" editable tip="x" onChange={() => {}} />);
        const input = screen.getByRole('textbox', { name: /短篇 ID/ });
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription(
            '只可使用小楷英文字母、數字及連字號（例如 heart-arc）',
        );
    });

    it('should be read-only once published', () => {
        render(<IdField value="lancy" editable={false} tip="已發佈，不可更改" />);
        expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
        expect(screen.getByRole('img', { name: '已發佈，不可更改' })).toBeInTheDocument();
    });

    it('should mark an unconfirmed auto ID red (field + label) without an error text', () => {
        render(<IdField value="drama-01" editable unconfirmed tip="x" onChange={() => {}} />);
        const input = screen.getByRole('textbox', { name: /ID/ });
        expect(input.closest('label')).toHaveClass('field', 'unconfirmed');
        expect(input).not.toHaveAttribute('aria-invalid');
    });
});
