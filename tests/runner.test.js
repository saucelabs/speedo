import { remote } from 'webdriverio'

import runPerformanceTest from '../src/runner'

beforeEach(async () => {
    jest.clearAllMocks()
})

test('runPerformanceTest', async () => {
    const result = await runPerformanceTest(
        'myuser',
        'mykey',
        {
            region: 'eu',
            platformName: 'Playstation',
            browserVersion: 123,
            tunnelIdentifier: 'foobar',
            site: 'http://localhost:8080',
            crmuxdriverVersion: 'stable'
        },
        'testname',
        'buildname',
        '/some/dir'
    )
    expect(result).toMatchSnapshot()
    expect(remote).toBeCalledTimes(1)
    expect(remote.mock.calls).toMatchSnapshot()
    expect((await remote()).throttleNetwork).toHaveBeenCalledTimes(1)
    expect((await remote()).execute).toHaveBeenCalledTimes(3)
    expect((await remote()).url).toBeCalledWith('http://0.0.0.0:8080')
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
            parentTunnel: 'foobaz',
            site: 'https://saucelabs.com',
            crmuxdriverVersion: 'foobar'
        },
        'testname',
        'buildname',
        '/some/dir'
    )
    expect(result).toMatchSnapshot()
    expect(remote).toBeCalledTimes(1)
    expect(remote.mock.calls).toMatchSnapshot()
    expect((await remote()).throttleNetwork).toHaveBeenCalledTimes(1)
    expect((await remote()).execute).toHaveBeenCalledTimes(3)
    expect((await remote()).url).toBeCalledWith('https://saucelabs.com')
})

test('runPerformanceTest without args', async () => {
    const result = await runPerformanceTest(
        'myuser',
        'mykey',
        { site: 'https://saucelabs.com' },
        'testname',
        'buildname',
        '/some/dir'
    )
    expect(result).toMatchSnapshot()
    expect(remote).toBeCalledTimes(1)
    expect(remote.mock.calls).toMatchSnapshot()
    expect((await remote()).throttleNetwork).toHaveBeenCalledTimes(1)
    expect((await remote()).execute).toHaveBeenCalledTimes(3)
})

test('runPerformanceTest reruns if log command fails', async () => {
    await runPerformanceTest(
        // overwrite driver mock (see webdriverio mock)
        {
            assertPerformance: jest.fn()
                .mockReturnValueOnce(Promise.reject(new Error('boom')))
                .mockReturnValueOnce(Promise.reject(new Error('boom2')))
                .mockReturnValueOnce(Promise.resolve({ value: { metrics: {} }})),
        },
        'mykey',
        {
            region: 'eu',
            platformName: 'Playstation',
            browserVersion: 123,
            tunnelIdentifier: 'foobar',
            site: 'https://saucelabs.com'
        },
        'testname',
        'buildname',
        '/some/dir'
    )

    expect(remote).toBeCalledTimes(3)
})

test('runPerformanceTest throws anyway if assertPerformance continues to fail', async () => {
    expect.assertions(2)

    try {
        await runPerformanceTest(
            // I know, this is not a user object but we abuse this in
            // order overwrite driver mock (see webdriverio mock)
            {
                assertPerformance: jest.fn()
                    .mockReturnValueOnce(Promise.reject(new Error('boom')))
                    .mockReturnValueOnce(Promise.reject(new Error('boom1')))
                    .mockReturnValueOnce(Promise.reject(new Error('boom2')))
                    .mockReturnValueOnce(Promise.reject(new Error('boom3')))
                    .mockReturnValueOnce(Promise.resolve({ value: { metrics: {} }})),
            },
            'mykey',
            {
                region: 'eu',
                platformName: 'Playstation',
                browserVersion: 123,
                tunnelIdentifier: 'foobar',
                site: 'https://saucelabs.com'
            },
            'testname',
            'buildname',
            '/some/dir'
        )
    } catch (e) {
        expect(remote).toBeCalledTimes(4)
        expect(e.message).toContain('boom3')
    }
})

test('runPerformanceTest should not call commands if no throttling is applied', async () => {
    await runPerformanceTest(
        'myuser',
        'mykey',
        {
            throttleCpu: 0,
            throttleNetwork: 'online',
            site: 'https://saucelabs.com'
        },
        'testname',
        'buildname',
        '/some/dir'
    )
    expect((await remote()).throttleNetwork).toHaveBeenCalledTimes(0)
    expect((await remote()).execute).toHaveBeenCalledTimes(2)
})
