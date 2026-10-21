import { OG_IMAGE_PATH, buildSocialTags, resolveSiteUrl } from './socialMeta';

const GITHUB_PAGES_BASE = '/903-player/';
const ROOT_BASE = '/';

describe('resolveSiteUrl', () => {
    it('should use the Vercel production domain on Vercel', () => {
        expect(
            resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: '903-player.vercel.app' }, ROOT_BASE),
        ).toBe('https://903-player.vercel.app/');
    });

    it('should use the GitHub Pages address in GitHub Actions', () => {
        expect(resolveSiteUrl({ GITHUB_REPOSITORY_OWNER: 'dcwhung' }, GITHUB_PAGES_BASE)).toBe(
            'https://dcwhung.github.io/903-player/',
        );
    });

    it('should prefer Vercel when both are set', () => {
        expect(
            resolveSiteUrl(
                {
                    VERCEL_PROJECT_PRODUCTION_URL: '903-player.vercel.app',
                    GITHUB_REPOSITORY_OWNER: 'dcwhung',
                },
                ROOT_BASE,
            ),
        ).toBe('https://903-player.vercel.app/');
    });

    it('should be undefined for a local build', () => {
        expect(resolveSiteUrl({}, GITHUB_PAGES_BASE)).toBeUndefined();
    });
});

describe('buildSocialTags', () => {
    const siteUrl = 'https://903-player.vercel.app/';
    const content = (property: string): unknown =>
        buildSocialTags(siteUrl).find((tag) => tag.attrs?.property === property)?.attrs?.content;

    it('should point og:image at the absolute share image', () => {
        expect(content('og:image')).toBe(`${siteUrl}${OG_IMAGE_PATH}`);
    });

    it('should set og:url to the site address', () => {
        expect(content('og:url')).toBe(siteUrl);
    });

    it('should give the image size so previews render before it loads', () => {
        expect(content('og:image:width')).toBe('1200');
        expect(content('og:image:height')).toBe('630');
    });
});
