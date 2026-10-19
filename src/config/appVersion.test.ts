import packageJson from '../../package.json';
import { APP_VERSION, formatAppVersion } from './appVersion';

describe('appVersion', () => {
    it('should read the version from package.json when built', () => {
        expect(APP_VERSION).toBe(packageJson.version);
    });

    it('should prefix the version with v when formatted', () => {
        expect(formatAppVersion('0.2.0')).toBe('v0.2.0');
    });
});
