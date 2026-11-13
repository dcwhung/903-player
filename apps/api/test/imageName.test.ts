import { hashOfImageName } from '../src/assets/imageName';

describe('hashOfImageName (S-905)', () => {
    it('should take the part before the extension', () => {
        expect(hashOfImageName('0123456789abcdef.webp')).toBe('0123456789abcdef');
    });

    it('should give the whole name without an extension, and empty for empty', () => {
        expect(hashOfImageName('0123456789abcdef')).toBe('0123456789abcdef');
        expect(hashOfImageName('')).toBe('');
    });
});
