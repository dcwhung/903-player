import { scanListing } from './listing';
import { listingOf } from './testListing';

describe('scanListing', () => {
    it('should classify covers, audio and ignored files at both levels', () => {
        const scan = scanListing(
            listingOf('劇', [
                'cover photo.png',
                'stray.m4a',
                '.DS_Store',
                'Thumbs.db',
                'notes.txt',
                '甲/01 - 甲 - 第一集.m4a',
                '甲/cover photo.jpg',
                '甲/.DS_Store',
                '甲/notes.txt',
                '甲/extra/01.m4a',
                '甲/.git/x',
            ]),
        );
        expect(scan).toMatchObject({
            name: '劇',
            audio: ['stray.m4a'],
            covers: ['cover photo.png'],
            coverPhoto: 'cover photo.png',
            ignored: ['.DS_Store', 'Thumbs.db', 'notes.txt'],
        });
        expect(scan.arcs).toEqual([
            {
                rawName: '甲',
                name: '甲',
                audio: ['01 - 甲 - 第一集.m4a'],
                covers: ['cover photo.jpg'],
                coverPhoto: 'cover photo.jpg',
                ignored: ['.DS_Store', '.git', 'extra/', 'notes.txt'],
            },
        ]);
    });

    it('should treat hidden or system folders at the top as ignored, not arcs', () => {
        const scan = scanListing(listingOf('劇', ['.hidden/x.m4a', '甲/01 - 甲 - 第一集.m4a']));
        expect(scan.arcs.map((a) => a.name)).toEqual(['甲']);
        expect(scan.ignored).toEqual(['.hidden']);
    });

    it('should order arcs by the UTF-8 bytes of their NFC names', () => {
        const nfd = 'Café'.normalize('NFD');
        const scan = scanListing(listingOf(nfd, ['乙/a.m4a', '甲/a.m4a', `${nfd}/a.m4a`]));
        expect(scan.rawName).toBe(nfd);
        expect(scan.name).toBe('Café'.normalize('NFC'));
        expect(scan.arcs.map((a) => a.name)).toEqual(['Café'.normalize('NFC'), '乙', '甲']);
        expect(scan.arcs[0]?.rawName).toBe(nfd);
    });
});

describe('scanListing cover roles', () => {
    it.each(['jpg', 'jpeg', 'png', 'webp'])(
        'should pick cd cover / cover photo with .%s',
        (ext) => {
            const scan = scanListing(listingOf('劇', [`cd cover.${ext}`, `cover photo.${ext}`]));
            expect(scan.cdCover).toBe(`cd cover.${ext}`);
            expect(scan.coverPhoto).toBe(`cover photo.${ext}`);
        },
    );

    it('should match the fixed names case-insensitively and keep the original name', () => {
        const scan = scanListing(listingOf('劇', ['CD Cover.JPG', 'Cover Photo.Webp']));
        expect(scan.cdCover).toBe('CD Cover.JPG');
        expect(scan.coverPhoto).toBe('Cover Photo.Webp');
    });

    it('should list other images as covers without pairing them', () => {
        const scan = scanListing(
            listingOf('劇', ['poster.png', 'cd cover 2.jpg', 'my cover photo.png', 'cdcover.jpg']),
        );
        expect(scan.covers).toEqual([
            'cd cover 2.jpg',
            'cdcover.jpg',
            'my cover photo.png',
            'poster.png',
        ]);
        expect(scan).not.toHaveProperty('cdCover');
        expect(scan).not.toHaveProperty('coverPhoto');
    });

    it('should keep matched covers in the covers list too', () => {
        const scan = scanListing(listingOf('劇', ['cd cover.png', 'poster.png']));
        expect(scan.covers).toEqual(['cd cover.png', 'poster.png']);
    });

    it('should not pair a non-image file or a folder with a cover name', () => {
        const scan = scanListing(listingOf('劇', ['cd cover.gif', 'cover photo.txt']));
        expect(scan).not.toHaveProperty('cdCover');
        expect(scan).not.toHaveProperty('coverPhoto');
    });

    it('should pick the first in byte order when two extensions match', () => {
        const scan = scanListing(listingOf('劇', ['cd cover.png', 'cd cover.jpg']));
        expect(scan.cdCover).toBe('cd cover.jpg');
    });

    it('should pick covers per arc', () => {
        const scan = scanListing(
            listingOf('劇', ['甲/01 - 甲 - 第一集.m4a', '甲/cd cover.webp', '乙/01.m4a']),
        );
        const [yi, jia] = scan.arcs;
        expect(jia?.cdCover).toBe('cd cover.webp');
        expect(yi).not.toHaveProperty('cdCover');
        expect(scan).not.toHaveProperty('cdCover');
    });
});
