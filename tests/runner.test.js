import { remote } from 'webdriverio'

import runPerformanceTest from '../src/runner'

test('runPerformanceTest', async () => {
    const result = await runPerformanceTest(
        'myuser',
        'mykey',
        {
            region: 'eu',
            platformName: 'Playstation',
            browserVersion: 123,
            tunnelIdentifier: 'foobar'
        },
        'testname',
        'buildname',
        '/some/dir'
    )
    expect(result).toMatchSnapshot()
    expect(remote.mock.calls).toMatchSnapshot()
})

test('runPerformanceTest w/ parentTunnel', async () => {
    const result = await runPerformanceTest(
        'myuser',
        'mykey',
        {
            region: 'eu',
            platformName: 'Playstation',
            browserVersion: 123,
            tunnelIdentifier: 'foobar',
            parentTunnel: 'foobaz'
        },
        'testname',
        'buildname',
        '/some/dir'
    )
    expect(result).toMatchSnapshot()
    expect(remote.mock.calls).toMatchSnapshot()
})

test('runPerformanceTest without args', async () => {
    const result = await runPerformanceTest(
        'myuser',
        'mykey',
        {},
        'testname',
        'buildname',
        '/some/dir'
    )
    expect(result).toMatchSnapshot()
    expect(remote.mock.calls).toMatchSnapshot()
})
