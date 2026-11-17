// @vitest-environment node
// e2e/visualModel.mjs（「現有裝置零改變」截圖比對，P10 lane 0）嘅純邏輯：凍結 viewport 清單、命名、參數、位置比對、總結。
// 瀏覽器嗰邊（e2e/visualDiff.mjs）冇 unit test，靠 `npm run e2e:visual` 自己對自己（VISUAL_BASE=HEAD）驗
import {
    GEOMETRY_REPORT_LIMIT,
    VISUAL_VIEWPORTS,
    diffGeometry,
    normalizeVersionText,
    parseVisualArgs,
    selectShots,
    shotName,
    summarize,
} from '../e2e/visualModel.mjs';
import { LANDSCAPE_QUERY, SHORT_LANDSCAPE_QUERY, WIDE_BANNER_QUERY } from './config/layout';

const LANDSCAPE_MIN_WIDTH = 640;
const SHORT_MAX_HEIGHT = 561;

type Viewport = (typeof VISUAL_VIEWPORTS)[number];

const isLandscape = ({ width, height }: Viewport) => width > height && width >= LANDSCAPE_MIN_WIDTH;
const isShortLandscape = (viewport: Viewport) =>
    isLandscape(viewport) && viewport.height <= SHORT_MAX_HEIGHT;
const isWideBanner = (viewport: Viewport) =>
    isLandscape(viewport) && viewport.height > SHORT_MAX_HEIGHT;

describe('VISUAL_VIEWPORTS（凍結嘅現有裝置清單）', () => {
    it('上面嘅分類數字同 src/config/layout.ts 一致', () => {
        expect(LANDSCAPE_QUERY).toContain(`min-width: ${LANDSCAPE_MIN_WIDTH}px`);
        expect(SHORT_LANDSCAPE_QUERY).toContain(`max-height: ${SHORT_MAX_HEIGHT}px`);
        expect(WIDE_BANNER_QUERY).toContain(`min-height: ${SHORT_MAX_HEIGHT + 1}px`);
    });

    it('id 唔重複，而且就係「闊x高」', () => {
        const ids = VISUAL_VIEWPORTS.map((viewport) => viewport.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const viewport of VISUAL_VIEWPORTS) {
            expect(viewport.id).toBe(`${viewport.width}x${viewport.height}`);
        }
    });

    it('包晒手機直、手機橫、平板直、平板橫、電腦橫', () => {
        const kinds = new Set(VISUAL_VIEWPORTS.map((viewport) => viewport.kind));
        expect([...kinds].sort()).toEqual(
            [
                'desktop',
                'phone-landscape',
                'phone-portrait',
                'tablet-landscape',
                'tablet-portrait',
            ].sort(),
        );
    });

    it('每個分類嘅 viewport 都落喺應有嘅版面', () => {
        for (const viewport of VISUAL_VIEWPORTS) {
            if (viewport.kind === 'phone-portrait' || viewport.kind === 'tablet-portrait') {
                expect(isLandscape(viewport), viewport.id).toBe(false);
            }
            if (viewport.kind === 'tablet-landscape' || viewport.kind === 'desktop') {
                expect(isWideBanner(viewport), viewport.id).toBe(true);
            }
        }
        // 手機打橫：有窄過 640（照出直版）嘅，亦有入到橫版嘅
        const phoneLandscape = VISUAL_VIEWPORTS.filter((v) => v.kind === 'phone-landscape');
        expect(phoneLandscape.some(isShortLandscape)).toBe(true);
        expect(phoneLandscape.some((v) => !isLandscape(v))).toBe(true);
    });

    it('包埋斷點邊界（640 闊、561 / 562 高）', () => {
        const ids = VISUAL_VIEWPORTS.map((viewport) => viewport.id);
        expect(ids).toEqual(expect.arrayContaining(['640x360', '1000x561', '1000x562']));
    });

    it('手機、平板係觸控，電腦唔係', () => {
        for (const viewport of VISUAL_VIEWPORTS) {
            expect(viewport.touch, viewport.id).toBe(viewport.kind !== 'desktop');
        }
    });
});

describe('shotName', () => {
    it('情境 + viewport id，可以直接做檔名', () => {
        expect(shotName('home-shows', { id: '390x844' })).toBe('home-shows@390x844');
    });
});

describe('selectShots', () => {
    const scenes = [{ id: 'home-shows' }, { id: 'show' }];
    const viewports = [{ id: '390x844' }, { id: '844x390' }];

    it('冇 filter：每個 viewport × 每個情境', () => {
        const shots = selectShots(scenes, viewports, { scenes: [], viewports: [] });
        expect(shots.map((shot) => shot.name)).toEqual([
            'home-shows@390x844',
            'show@390x844',
            'home-shows@844x390',
            'show@844x390',
        ]);
    });

    it('有 filter：只留揀中嘅', () => {
        const shots = selectShots(scenes, viewports, { scenes: ['show'], viewports: ['844x390'] });
        expect(shots.map((shot) => shot.name)).toEqual(['show@844x390']);
    });

    it('filter 冇一個啱：throw（唔好靜靜雞跑零張當 pass）', () => {
        expect(() => selectShots(scenes, viewports, { scenes: ['nope'], viewports: [] })).toThrow(
            /nope/,
        );
        expect(() => selectShots(scenes, viewports, { scenes: [], viewports: ['1x1'] })).toThrow(
            /1x1/,
        );
    });
});

describe('parseVisualArgs', () => {
    it('預設：冇 filter、base 由 caller 決定', () => {
        expect(parseVisualArgs([], {})).toEqual({
            base: undefined,
            scenes: [],
            viewports: [],
            keepWorktree: false,
        });
    });

    it('VISUAL_BASE、--scene、--viewport（可以重複或者用逗號）、--keep-worktree', () => {
        expect(
            parseVisualArgs(
                [
                    '--scene',
                    'show,today',
                    '--viewport=390x844',
                    '--viewport',
                    '844x390',
                    '--keep-worktree',
                ],
                { VISUAL_BASE: 'origin/main' },
            ),
        ).toEqual({
            base: 'origin/main',
            scenes: ['show', 'today'],
            viewports: ['390x844', '844x390'],
            keepWorktree: true,
        });
    });

    it('--base 蓋過 VISUAL_BASE', () => {
        expect(parseVisualArgs(['--base', 'abc123'], { VISUAL_BASE: 'origin/main' }).base).toBe(
            'abc123',
        );
    });

    it('唔識嘅參數、或者冇值：throw', () => {
        expect(() => parseVisualArgs(['--wat'], {})).toThrow(/--wat/);
        expect(() => parseVisualArgs(['--scene'], {})).toThrow(/--scene/);
    });
});

describe('normalizeVersionText', () => {
    it('版本號換做固定字（兩個 build 版本唔同都唔會當係改咗）', () => {
        expect(normalizeVersionText('v1.37.3')).toBe('v0.0.0');
        expect(normalizeVersionText('903 Player v2.0.0 · 測試')).toBe('903 Player v0.0.0 · 測試');
    });

    it('讀屏用嘅「版本 1.37.3」（冇 v）都換', () => {
        expect(normalizeVersionText('版本 1.37.3')).toBe('版本 0.0.0');
    });

    it('其他字照舊', () => {
        expect(normalizeVersionText('第 12 集')).toBe('第 12 集');
    });
});

describe('diffGeometry', () => {
    const item = (key: string, x: number) => ({ key, x, y: 0, width: 10, height: 10 });

    it('完全一樣：冇差異', () => {
        expect(diffGeometry([item('button|播放', 1)], [item('button|播放', 1)])).toEqual([]);
    });

    it('位置唔同：列出嗰個元素兩邊嘅值', () => {
        expect(diffGeometry([item('button|播放', 1)], [item('button|播放', 2)])).toEqual([
            { index: 0, base: item('button|播放', 1), head: item('button|播放', 2) },
        ]);
    });

    it('subpixel 內嘅浮點誤差唔算', () => {
        expect(diffGeometry([item('a', 1)], [item('a', 1.004)])).toEqual([]);
    });

    it('多咗 / 少咗元素：另一邊係 null', () => {
        expect(diffGeometry([item('a', 1)], [item('a', 1), item('b', 2)])).toEqual([
            { index: 1, base: null, head: item('b', 2) },
        ]);
    });

    it('最多報 GEOMETRY_REPORT_LIMIT 個', () => {
        const count = GEOMETRY_REPORT_LIMIT + 5;
        const base = Array.from({ length: count }, (_, i) => item(`e${i}`, 0));
        const head = Array.from({ length: count }, (_, i) => item(`e${i}`, 5));
        expect(diffGeometry(base, head)).toHaveLength(GEOMETRY_REPORT_LIMIT);
    });
});

describe('summarize', () => {
    it('全部一樣：ok', () => {
        const summary = summarize([{ name: 'show@390x844', pixels: 0, geometry: [] }]);
        expect(summary.ok).toBe(true);
        expect(summary.lines.at(-1)).toMatch(/1 張.*全部一樣/);
    });

    it('有像素或者位置差異：唔 ok，逐張列出', () => {
        const summary = summarize([
            { name: 'show@390x844', pixels: 0, geometry: [] },
            { name: 'today@390x844', pixels: 42, geometry: [] },
            {
                name: 'home-shows@844x390',
                pixels: 0,
                geometry: [
                    {
                        index: 3,
                        base: null,
                        head: { key: 'img|', x: 0, y: 0, width: 1, height: 1 },
                    },
                ],
            },
        ]);
        expect(summary.ok).toBe(false);
        const text = summary.lines.join('\n');
        expect(text).toMatch(/today@390x844.*42/);
        expect(text).toMatch(/home-shows@844x390.*1/);
        expect(text).not.toMatch(/^DIFF.*show@390x844/m);
        expect(summary.lines.at(-1)).toMatch(/3 張.*2 張唔同/);
    });

    it('一張都冇：唔 ok', () => {
        expect(summarize([]).ok).toBe(false);
    });
});
