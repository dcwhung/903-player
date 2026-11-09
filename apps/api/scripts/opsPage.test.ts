// @vitest-environment node
/*
 * public/（ops 頁，static assets 直接出）：ops.js 用到嘅 id 全部要喺 index.html；
 * 唔准用 innerHTML（server 資料一律 textContent）；ops.css 唔准有動畫（減少動態規則：冇動畫就唔使處理）
 */
import { readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');
const html = read('index.html');
const js = read('ops.js');
const css = read('ops.css');

describe('ops page', () => {
    it('should define every element id that ops.js looks up', () => {
        const ids = [...js.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]);
        expect(ids.length).toBeGreaterThan(0);
        const missing = ids.filter((id) => !html.includes(`id="${id}"`));
        expect(missing).toEqual([]);
    });

    it('should never write server data as HTML', () => {
        expect(js).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
    });

    it('should load its CSS and JS from files (no inline script)', () => {
        expect(html).toContain('href="/ops.css"');
        expect(html).toContain('src="/ops.js"');
        expect(html).not.toMatch(/<script>(?!<\/script>)/);
    });

    it('should not animate', () => {
        expect(css).not.toMatch(/animation|transition/);
    });
});
