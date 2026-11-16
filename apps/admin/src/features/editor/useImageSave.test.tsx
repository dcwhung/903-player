import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { fakeData, resource } from '../../../tests/renderApp';
import type { ChangesResponse } from '../../api/types';
import { AdminDataContext } from '../../data/AdminData';
import type { EntryEditor } from './useEntryEditor';
import { useImageSave } from './useImageSave';

const setup = (saved: boolean) => {
    const changes = resource<ChangesResponse>(undefined);
    const editor = { patchSaved: vi.fn(() => Promise.resolve(saved)) } as unknown as EntryEditor;
    const wrapper = ({ children }: { children: ReactNode }) => (
        <AdminDataContext.Provider value={fakeData({ changes })}>
            {children}
        </AdminDataContext.Provider>
    );
    const { result } = renderHook(() => useImageSave(editor), { wrapper });
    return { saveImage: result.current, changes, editor };
};

describe('useImageSave', () => {
    it('should reload the pending changes after the image is saved (nav 待發佈 count)', async () => {
        const { saveImage, changes, editor } = setup(true);
        await saveImage('disc', 'abc.webp');
        expect(editor.patchSaved).toHaveBeenCalledTimes(1);
        expect(changes.reload).toHaveBeenCalledTimes(1);
    });

    it('should not reload the pending changes when saving fails', async () => {
        const { saveImage, changes } = setup(false);
        await saveImage('disc', 'abc.webp');
        expect(changes.reload).not.toHaveBeenCalled();
    });
});
