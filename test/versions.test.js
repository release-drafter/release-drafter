const { getVersionInfo } = require('../lib/versions')

describe('versions', () => {
    it('extracts a version-like string from the last tag', () => {
        const versionInfo = getVersionInfo({
            tag_name: 'v10.0.3',
            name: 'Some release'
        });

        expect(versionInfo.incrementedMajor).toEqual('11.0.0');
        expect(versionInfo.incrementedMinor).toEqual('10.1.0');
        expect(versionInfo.incrementedPatch).toEqual('10.0.4');
    })

    it('extracts a version-like string from the last release name', () => {
        const versionInfo = getVersionInfo({
            tag_name: 'notaproperversion',
            name: '10.0.3'
        });

        expect(versionInfo.incrementedMajor).toEqual('11.0.0');
        expect(versionInfo.incrementedMinor).toEqual('10.1.0');
        expect(versionInfo.incrementedPatch).toEqual('10.0.4');
    })

    it('extracts a version-like string from the last tag instead of the release name, if conflicting', () => {
        const versionInfo = getVersionInfo({
            tag_name: '10.0.3',
            name: '8.1.0'
        });

        expect(versionInfo.incrementedMajor).toEqual('11.0.0');
        expect(versionInfo.incrementedMinor).toEqual('10.1.0');
        expect(versionInfo.incrementedPatch).toEqual('10.0.4');
    })

    it('gives up if a semver version-like string cannot be found in either tag or release name', () => {
        const versionInfo = getVersionInfo({
            tag_name: '10.0',
            name: 'not a proper version'
        });

        expect(versionInfo).toEqual(undefined);
    })
})