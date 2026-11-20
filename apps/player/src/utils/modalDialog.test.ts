import { hasOpenModalDialog } from './modalDialog';

const addDialog = (modal: string): HTMLElement => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', modal);
    document.body.append(dialog);
    return dialog;
};

afterEach(() => {
    document.body.replaceChildren();
});

describe('hasOpenModalDialog', () => {
    it('should be false with no dialog open', () => {
        expect(hasOpenModalDialog()).toBe(false);
    });

    it('should be true while a modal dialog is open', () => {
        addDialog('true');
        expect(hasOpenModalDialog()).toBe(true);
    });

    it('should ignore a docked (non-modal) dialog', () => {
        addDialog('false');
        expect(hasOpenModalDialog()).toBe(false);
    });

    it('should ignore the given element (the ambient overlay itself)', () => {
        const overlay = addDialog('true');
        expect(hasOpenModalDialog(overlay)).toBe(false);

        addDialog('true');
        expect(hasOpenModalDialog(overlay)).toBe(true);
    });
});
