import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SelectionFooter } from './SelectionFooter';

const SELECTION = {
    content: ['newArc/lancy/love-after'],
    branding: { icon: false, text: false },
    banner: false,
};

const Where = () => {
    const location = useLocation();
    return <p data-testid="where">{`${location.pathname}${location.search}`}</p>;
};

const renderFooter = (path: string | undefined) =>
    render(
        <MemoryRouter initialEntries={['/update']}>
            <Routes>
                <Route
                    path="/update"
                    element={
                        <SelectionFooter
                            selection={SELECTION}
                            path={path}
                            incomplete={0}
                            others={[]}
                            loading={false}
                        />
                    }
                />
                <Route path="*" element={<Where />} />
            </Routes>
        </MemoryRouter>,
    );

const next = () => screen.getByRole('button', { name: '下一步：確認發佈' });

describe('SelectionFooter', () => {
    // S-1093：「下一步」同 Stepper 用同一個 usePublishPlan.path，唔再自己計多次條件
    it('should stay disabled when the publish plan has no path', () => {
        renderFooter(undefined);
        expect(next()).toBeDisabled();
    });

    it('should go to the path from the publish plan', async () => {
        renderFooter('/publish?selection=plan');
        await userEvent.click(next());
        expect(screen.getByTestId('where')).toHaveTextContent('/publish?selection=plan');
    });
});
