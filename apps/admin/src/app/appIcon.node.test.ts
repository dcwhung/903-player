// @vitest-environment node
// 收合 nav 左上角用 player 嘅 app icon：複製一份喺 admin public/（唔由 admin 直接引用 player 路徑）
import { existsSync, readFileSync } from 'node:fs';

const ADMIN_ICON = new URL('../../public/icon-192.png', import.meta.url);
const PLAYER_ICON = new URL('../../../player/public/icon-192.png', import.meta.url);

describe('admin app icon (public/icon-192.png)', () => {
    it('should be a copy of the player icon', () => {
        expect(existsSync(ADMIN_ICON)).toBe(true);
        expect(readFileSync(ADMIN_ICON).equals(readFileSync(PLAYER_ICON))).toBe(true);
    });
});

// 重新裁切內建圖示（icon recrop）用嘅原圖：apps/player/assets/app-icon.png 嘅副本（player icon 都係由佢生成）
const ADMIN_SOURCE = new URL('../assets/icon/app-icon.png', import.meta.url);
const DESIGN_SOURCE = new URL('../../../player/assets/app-icon.png', import.meta.url);

describe('built-in icon original (src/assets/icon/app-icon.png)', () => {
    it('should be a copy of apps/player/assets/app-icon.png', () => {
        expect(readFileSync(ADMIN_SOURCE).equals(readFileSync(DESIGN_SOURCE))).toBe(true);
    });
});
