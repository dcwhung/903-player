/* Publish 警告（唔阻 publish）：theme contrast 唔合格 + 未設定配色（= NEUTRAL_THEME） */
import { NEUTRAL_THEME } from '@903-player/catalog';
import { adminGet, adminPost } from './helpers';
import { SHOW, drama, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

/** NEUTRAL_THEME 減 art（theme JSON 冇 art） */
const NEUTRAL_COLOURS: Json = Object.fromEntries(
    Object.entries(NEUTRAL_THEME).filter(([key]) => key !== 'art'),
);

/** fixture 淺色 theme + accentText：全部色對合格（fixture 本身 accent 對 bg 唔夠 3:1） */
const PASSING_THEME: Json = { ...(drama(3).theme as Json), accentText: '#7f5500' };

const publishBody = async () => {
    const response = await adminPost('/api/publish');
    expect(response.status).toBe(200);
    return (await response.json()) as { warnings: Json[]; unchanged?: boolean };
};

const changesBody = async () => (await (await adminGet('/api/changes')).json()) as Json;

describe('publish warnings', () => {
    beforeEach(async () => {
        await seed(3);
        await putEntry('shows', 'badgirl', { ...SHOW, theme: PASSING_THEME });
        await putEntry('dramas', 'golden', { ...drama(3), theme: PASSING_THEME });
    });

    it('should answer an empty list when every theme is set and passes contrast', async () => {
        expect((await publishBody()).warnings).toEqual([]);
        expect((await changesBody()).warnings).toEqual([]);
    });

    it('should warn (and still publish) for a theme equal to NEUTRAL_THEME', async () => {
        await putEntry('dramas', 'golden', { ...drama(3), theme: NEUTRAL_COLOURS });
        const body = await publishBody();
        expect(body.warnings).toEqual([{ kind: 'neutralTheme', target: 'dramas/golden' }]);
        expect((await changesBody()).warnings).toEqual(body.warnings);
    });

    it('should ignore optional theme keys when matching NEUTRAL_THEME, but not a changed colour', async () => {
        await putEntry('shows', 'badgirl', {
            ...SHOW,
            theme: { ...NEUTRAL_COLOURS, titleFont: 'serif' },
        });
        expect((await publishBody()).warnings).toEqual([
            { kind: 'neutralTheme', target: 'shows/badgirl' },
        ]);
        await putEntry('shows', 'badgirl', {
            ...SHOW,
            theme: { ...NEUTRAL_COLOURS, track: '#343434' },
        });
        expect((await publishBody()).warnings).toEqual([]);
    });

    it('should report the fixture light theme accent without accentText', async () => {
        await putEntry('dramas', 'golden', drama(3));
        expect((await publishBody()).warnings).toEqual([
            expect.objectContaining({
                kind: 'contrast',
                target: 'dramas/golden',
                foreground: 'accent',
                background: 'bg',
                minimum: 3,
            }),
        ]);
    });

    it('should list each failing contrast pair with its ratio', async () => {
        const theme = { ...PASSING_THEME, muted: '#f7e7b4' };
        await putEntry('dramas', 'golden', { ...drama(3), theme });
        const { warnings } = await publishBody();
        expect(warnings).toEqual([
            {
                kind: 'contrast',
                target: 'dramas/golden',
                foreground: 'muted',
                background: 'bg',
                ratio: 1,
                minimum: 4.5,
            },
            expect.objectContaining({
                kind: 'contrast',
                target: 'dramas/golden',
                foreground: 'muted',
                background: 'surface',
            }),
        ]);
    });

    it('should still return warnings when the content is unchanged', async () => {
        await putEntry('dramas', 'golden', { ...drama(3), theme: NEUTRAL_COLOURS });
        await publishBody();
        const again = await publishBody();
        expect(again.unchanged).toBe(true);
        expect(again.warnings).toHaveLength(1);
    });

    it('should answer [] warnings in /api/changes when validation fails', async () => {
        await putEntry(
            'dramas',
            'golden',
            { ...drama(3), theme: NEUTRAL_COLOURS },
            {
                'tile.webp': 'nothere0000000000.webp',
            },
        );
        const body = await changesBody();
        expect(body.validation).toMatchObject({ ok: false });
        expect(body.warnings).toEqual([]);
    });
});
