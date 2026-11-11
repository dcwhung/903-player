import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
    it('should send the current deep link to /auth/google/start (S-809)', () => {
        render(
            <MemoryRouter initialEntries={['/dramas/lancy/schedule#lancy-02']}>
                <LoginScreen />
            </MemoryRouter>,
        );
        expect(screen.getByRole('link', { name: '使用 Google 登入' })).toHaveAttribute(
            'href',
            '/auth/google/start?next=%2Fdramas%2Flancy%2Fschedule%23lancy-02',
        );
    });
});
