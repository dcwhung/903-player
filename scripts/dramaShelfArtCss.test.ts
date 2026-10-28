// @vitest-environment node
// 放喺 scripts/：要用 node:fs 讀 CSS（見 launchThemeTokens.test.ts）
import { cssDeclarations, readCss } from '../tests/cssRule';

const css = (path: string) => readCss(new URL(path, import.meta.url));
const DRAMA_CSS = '../src/components/DramaShelf/DramaShelf.module.css';
const GESTURE_CSS = '../src/styles/gesture.module.css';

describe('DramaShelf .art CSS', () => {
    // CUI-0004：Safari 唔理 draggable 屬性，滑鼠捽書架要靠 CSS 擋拖圖片；iOS 長撳唔出圖片選單
    it('should stop Safari dragging the tile art and showing the long-press callout', () => {
        // 擋拖嗰行喺共用 gesture.module.css；DramaTile 有冇加 noImageDrag 由 DramaShelf.test.tsx 鎖
        expect(cssDeclarations(css(GESTURE_CSS), '.noImageDrag')['-webkit-user-drag']).toBe('none');
        expect(cssDeclarations(css(DRAMA_CSS), '.art')['-webkit-touch-callout']).toBe('none');
    });

    it('should stop Safari dragging any image inside a noImageDragWithin container', () => {
        expect(
            cssDeclarations(css(GESTURE_CSS), '.noImageDragWithin img')['-webkit-user-drag'],
        ).toBe('none');
    });
});
