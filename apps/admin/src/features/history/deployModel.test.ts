import { deployView, isTriggered } from './deployModel';

const row = (deploy: string) =>
    ({ id: 1, status: 'ok', deploy }) as unknown as Parameters<typeof isTriggered>[0];

describe('deployModel', () => {
    it('should show nothing for an old publish without a deploy field', () => {
        expect(deployView(undefined, undefined)).toBeNull();
    });

    it('should label none and skipped without polling or redeploy', () => {
        expect(deployView('none', undefined)).toMatchObject({
            labelKey: 'history.deployNone',
            polling: false,
            canRedeploy: false,
        });
        expect(deployView('skipped', undefined)?.labelKey).toBe('history.deploySkipped');
    });

    it('should let a failed trigger be redeployed', () => {
        expect(deployView('failed', undefined)).toMatchObject({
            labelKey: 'history.deployFailed',
            tone: 'bad',
            canRedeploy: true,
        });
    });

    it('should poll a triggered publish until the run concludes', () => {
        expect(deployView('triggered', undefined)?.polling).toBe(true);
        expect(deployView('triggered', { status: 'in_progress', url: 'u' })?.polling).toBe(true);
        expect(deployView('triggered', { status: 'success', url: 'u' })).toMatchObject({
            labelKey: 'history.deploySuccess',
            polling: false,
        });
        expect(deployView('triggered', { status: 'failure', url: 'u' })).toMatchObject({
            tone: 'bad',
            canRedeploy: true,
        });
        expect(deployView('triggered', { status: 'unknown', url: null })?.canRedeploy).toBe(true);
    });

    it('should only poll triggered ok rows', () => {
        expect(isTriggered(row('triggered'))).toBe(true);
        expect(isTriggered(row('none'))).toBe(false);
    });
});
