import { remote } from 'webdriverio'

import runPerformanceTest from '../src/runner'

test('runPerformanceTest', async () => {
    const result = await runPerformanceTest(
        'myuser',
        'mykey',
        {
            region: 'eu',
            platformName: 'Playstation',
            browserVersion: 123
        },
        'testname',
        'buildname',
        '/some/dir'
    )
    expect(result).toEqual({
        sessionId: 'foobarSession',
        result: { value: { metrics: {
            timeToFirstByte: 123,
            load: 321,
            speedIndex: 10,
            pageWeight: 1000
        } } }
    })

    const remoteArgs = remote.mock.calls[0][0]
    expect(remoteArgs.user).toBe('myuser')
    expect(remoteArgs.key).toBe('mykey')
    expect(remoteArgs.region).toBe('eu')
    expect(remoteArgs.outputDir).toBe('/some/dir')
    expect(remoteArgs.capabilities).toEqual({
        browserName: 'chrome',
        build: 'buildname',
        extendedDebugging: true,
        name: 'testname',
        platform: 'Playstation',
        version: 123
    })
})
