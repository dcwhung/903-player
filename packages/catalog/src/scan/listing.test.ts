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
            ignored: ['.DS_Store', 'Thumbs.db', 'notes.txt'],
        });
        expect(scan.arcs).toEqual([
            {
                rawName: '甲',
                name: '甲',
                audio: ['01 - 甲 - 第一集.m4a'],
                covers: ['cover photo.jpg'],
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
