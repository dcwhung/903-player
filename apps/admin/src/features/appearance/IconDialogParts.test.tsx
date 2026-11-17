/*
 * 更換 / 調整 App 圖示 dialog 嘅裝置掣（S-1104）：
 * 上載中（disabled）鎖住但照顯示揀中嗰部裝置；「所有裝置使用同一裁切」先冇一部揀中
 */
import { render, screen } from '@testing-library/react';
import { DeviceTabs } from './IconDialogParts';

const renderTabs = (props: { same: boolean; disabled: boolean }) =>
    render(<DeviceTabs {...props} device="android" onSame={() => {}} onDevice={() => {}} />);

describe('DeviceTabs', () => {
    it('should keep the chosen device pressed while locked during upload', () => {
        renderTabs({ same: false, disabled: true });
        const android = screen.getByRole('button', { name: 'Android' });
        expect(android).toBeDisabled();
        expect(android).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('group', { name: '裝置' }).querySelector('.seg-tabs-pill'),
        ).not.toBeNull();
    });

    it('should show no device chosen when every device shares one crop', () => {
        renderTabs({ same: true, disabled: false });
        for (const name of ['iPhone', 'Android', '瀏覽器分頁']) {
            const button = screen.getByRole('button', { name });
            expect(button).toBeDisabled();
            expect(button).toHaveAttribute('aria-pressed', 'false');
        }
        expect(
            screen.getByRole('group', { name: '裝置' }).querySelector('.seg-tabs-pill'),
        ).toBeNull();
    });
});
