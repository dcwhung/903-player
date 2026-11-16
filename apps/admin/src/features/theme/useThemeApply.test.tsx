import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { fakeData, resource } from '../../../tests/renderApp';
import type { ChangesResponse } from '../../api/types';
import { AdminDataContext } from '../../data/AdminData';
import type { EntryEditor } from '../editor/useEntryEditor';
import type { EntryTheme } from '../../model/theme';
import { useThemeApply } from './useThemeApply';

const THEME = {} as EntryTheme;

const setup = (saved: boolean) => {
    const changes = resource<ChangesResponse>(undefined);
    const editor = { patchSaved: vi.fn(() => Promise.resolve(saved)) } as unknown as EntryEditor;
    const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminDataContext.Provider value={fakeData({ changes })}>
            {children}
        </AdminDataContext.Provider>
    );
    const { result } = renderHook(() => useThemeApply(editor), { wrapper });
    return { apply: result.current, changes };
};

describe('useThemeApply', () => {
    it('should reload the pending changes after the theme is saved (nav 待發佈 count)', async () => {
        const { apply, changes } = setup(true);
        await expect(apply(THEME)).resolves.toBe(true);
        expect(changes.reload).toHaveBeenCalledTimes(1);
    });

    it('should not reload the pending changes when saving fails', async () => {
        const { apply, changes } = setup(false);
        await expect(apply(THEME)).resolves.toBe(false);
        expect(changes.reload).not.toHaveBeenCalled();
    });
});
