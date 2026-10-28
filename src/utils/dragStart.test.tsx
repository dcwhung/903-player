import { fireEvent, render, screen } from '@testing-library/react';
import { preventDragStart } from './dragStart';

describe('preventDragStart', () => {
    it('should cancel the native dragstart', () => {
        render(<div data-testid="target" onDragStart={preventDragStart} />);

        expect(fireEvent.dragStart(screen.getByTestId('target'))).toBe(false);
    });
});
