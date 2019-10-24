import ora from 'ora'
import yargs from 'yargs'
import { fixtures, lastInstance, resetSauceLabsFixtures } from 'saucelabs'

import { handler } from '../src/commands/run'
import runPerformanceTest from '../src/runner'
import {
    waitFor, getMetricParams, getJobUrl, startTunnel, getBudgetMetrics,
    getConfig, getLigthouseReportUrl, prepareBudgetData, printResult,
    printJankinessResult, getJankinessParam,
} from '../src/utils'
import { JANKINESS_RESULT } from './__fixtures__/jankiness'

jest.mock('../src/runner')
jest.mock('../src/utils')
jest.mock('../src/constants', () => ({
    TUNNEL_SHUTDOWN_TIMEOUT: 100,
    REQUIRED_TESTS_FOR_BASELINE_COUNT: 10,
    JANKINESS_METRIC: 'jankiness'
}))
jest.mock('fs')

beforeEach(() => {
    jest.spyOn(process, 'exit').mockImplementation(() => {})
    delete process.env.SAUCE_USERNAME
    delete process.env.SAUCE_ACCESS_KEY
    getConfig.mockImplementation((argv) => argv)
    getMetricParams.mockImplementation(() => ['speedIndex', 'pageWeight'])
    getJobUrl.mockImplementation(() => 'https://saucelabs.com/performance/foobar/0')
    getLigthouseReportUrl.mockImplementation(() => 'https://eds.us-west-1.saucelabs.com/foobar/performance/barfoo/lhr.html')
    waitFor.mockImplementation((condition) => condition())
    runPerformanceTest.mockImplementation(() => ({
        sessionId: 'foobar123',
        result: { result: 'pass' },
        benchmark: 1234,
        userAgent: 'chrome'
    }))
    printResult.mockImplementation((argv) => argv)
    printJankinessResult.mockImplementation((argv) => argv)
    prepareBudgetData.mockImplementation(({ load }) => ( load === 1000 ? {
        load: [{ l: 0, u: 1000 }],
        speedIndex: [{ l: 500, u: 1000 }]
    } : {
        load: [{ l: 0, u: 2000 }],
        speedIndex: [{ l: 1000, u: 1500 }]
    }))
    getJankinessParam.mockImplementation(({ jankiness }) => {
        if (!jankiness) {
            return null
        }
        return jankiness === 50 ?
            { jankiness: [{ l: 50, u: 100 }] } :
            { jankiness: [{ l: 90, u: 100 }] }
    })
    getBudgetMetrics.mockImplementation((budget) => Object.keys(budget))
})

test('run should fail if no auth is provided', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    await handler({})
    // eslint-disable-next-line no-console
    expect(console.error).toBeCalledTimes(1)
    expect(process.exit).toBeCalledWith(1)
    expect(yargs.showHelp).toBeCalledTimes(1)
    // eslint-disable-next-line no-console
    console.error.mockRestore()
})

test('fails when jobs can not be fetched', async () => {
    fixtures.listJobs = Promise.reject(new Error('buh'))
    await handler({ user: 'foo', key: 'bar', metric: ['load', 'speedIndex'] })
    expect(ora().fail).toBeCalledTimes(1)
    expect(ora().fail.mock.calls[0][0]).toContain('Couldn\'t fetch job')
    expect(process.exit).toBeCalledTimes(1)
})

test('should create a new baseline if run with no jobs', async () => {
    const opts = {
        user: 'foo',
        key: 'bar',
        site: 'mypage',
        metric: ['load', 'speedIndex'],
        name: 'foobar'
    }
    fixtures.listJobs = { jobs: [] }
    await handler(opts)
    expect(process.exit).toBeCalledWith(0)
    expect(ora().start)
        .toBeCalledWith('Couldn\'t find baseline for job with name "undefined", creating baseline...')
})

test('should rerun performance tests if they fail', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    let failures = 0
    runPerformanceTest.mockImplementation(() => {
        if (failures === 3) {
            return {
                sessionId: 'foobarRetried123',
                result: { result: 'pass' },
                benchmark: 1234,
                userAgent: 'chrome'
            }
        }
        ++failures
        return {
            sessionId: 'foobar123',
            result: { result: 'failed' },
            benchmark: 1234,
            userAgent: 'chrome'
        }
    })
    await handler({ user: 'foo', key: 'bar', site: 'mypage', retry: 3 })
    expect(ora().text).toBe('Run performance test (3rd retry)...')
    // eslint-disable-next-line no-console
    expect(console.log).toBeCalledTimes(1)
    expect(process.exit).toBeCalledWith(0)
    // eslint-disable-next-line no-console
    console.log.mockRestore()
})

test('should fail if job never completes', async () => {
    fixtures.getJob = Promise.reject(new Error('buh'))
    await handler({ user: 'foo', key: 'bar', site: 'mypage', metric: ['load', 'speedIndex'] })
    expect(process.exit).toBeCalledTimes(1)
})

test('should fail if performance logs can not be fetched', async () => {
    fixtures.getPerformanceMetrics = Promise.reject(new Error('buhhu'))
    await handler({ user: 'foo', key: 'bar', site: 'mypage', metric: ['load', 'speedIndex'] })
    expect(process.exit).toBeCalledTimes(1)
    expect(ora().fail.mock.calls[0][0]).toContain('Couldn\'t download performance results due to: Error: buhhu')
})

test('should continue if fetching trace logs fails', async () => {
    fixtures.downloadJobAsset = Promise.reject(new Error('buhhu'))
    await handler({ user: 'foo', key: 'bar', site: 'mypage', metric: ['load', 'speedIndex'], traceLogs: true })
    expect(process.exit).toBeCalledWith(0)
    expect(ora().fail.mock.calls[0][0]).toContain('Couldn\'t fetch trace logs: Error: buhhu')
})

test('should store tracelogs if path provided', async () => {
    await handler({
        user: 'foo',
        key: 'bar',
        site: 'mypage',
        metric: ['load', 'speedIndex'],
        traceLogs: true,
        logDir: '/foo/bar'
    })
    expect(lastInstance.downloadJobAsset.mock.calls).toMatchSnapshot()
})

test('should not fail if updating job status fails', async () => {
    fixtures.updateJob = Promise.reject(new Error('ups'))
    await handler({ user: 'foo', key: 'bar', site: 'mypage', metric: ['load', 'speedIndex'] })
    expect(process.exit).toBeCalledWith(0)
    expect(ora().fail.mock.calls[0][0]).toContain('Couldn\'t update job due to: Error: ups')
})

test('should run successfully', async () => {
    await handler({ user: 'foo', key: 'bar', site: 'mypage', metric: ['load', 'speedIndex'] })
    expect(process.exit).toBeCalledWith(0)
    expect(ora().start.mock.calls).toMatchSnapshot()
    expect(ora().stopAndPersist.mock.calls).toMatchSnapshot()
})

test('should fail if captured values are out of budget', async () => {
    await handler({
        user: 'foo',
        key: 'bar',
        site: 'mypage',
        budget: {
            load: 1000,
            speedIndex: [500, 1000]
        }
    })
    expect(printResult.mock.calls[0][0]).toMatchSnapshot()
    expect(process.exit).toBeCalledWith(1)    
})

test('should pass if captured values are within budget', async () => {
    await handler({
        user: 'foo',
        key: 'bar',
        site: 'mypage',
        budget: {
            load: 2000,
            speedIndex: [1000, 1500]
        }
    })
    expect(printResult.mock.calls[0][0]).toMatchSnapshot()
    expect(process.exit).toBeCalledWith(0)    
})

test('should run successfully with tunnels', async () => {
    const opts = {
        user: 'foo',
        key: 'bar',
        site: 'mypage',
        metric: ['load', 'speedIndex'],
        tunnelIdentifier: 'foobar'
    }
    const tunnelMock = {
        close: jest.fn().mockImplementation((cb) => setTimeout(cb, 100))
    }
    startTunnel.mockReturnValue(Promise.resolve(tunnelMock))

    await handler(opts)
    expect(process.exit).toBeCalledWith(0)
    expect(startTunnel).toBeCalledWith(
        expect.any(Object),
        'bar',
        '/some/tmpDir',
        opts.tunnelIdentifier
    )
    expect(tunnelMock.close).toBeCalledTimes(1)
})

test('should fail if tunnel can not be started', async () => {
    const opts = {
        user: 'foo',
        key: 'bar',
        site: 'mypage',
        metric: ['load', 'speedIndex'],
        tunnelIdentifier: 'foobar'
    }
    startTunnel.mockReturnValue(Promise.reject(new Error('ups')))
    await handler(opts)
    expect(ora().fail.mock.calls.pop()[0]).toContain('Problem setting up Sauce Connect')
    expect(process.exit).toBeCalledWith(1)
})

test('should not close tunnel if none was started', async () => {
    const tunnelMock = {
        close: jest.fn().mockImplementation((cb) => setTimeout(cb, 100))
    }
    startTunnel.mockReturnValue(Promise.resolve(null))

    await handler({
        user: 'foo',
        key: 'bar',
        site: 'mypage',
        metric: ['load', 'speedIndex'],
        tunnelIdentifier: 'foobar'
    })
    expect(process.exit).toBeCalledWith(0)
    expect(startTunnel).toBeCalledTimes(1)
    expect(tunnelMock.close).toBeCalledTimes(0)
})

test('should warn if tunnel can not be closed', async () => {
    const tunnelMock = { close: jest.fn() }
    startTunnel.mockReturnValue(Promise.resolve(tunnelMock))

    await handler({
        user: 'foo',
        key: 'bar',
        site: 'mypage',
        metric: ['load', 'speedIndex'],
        tunnelIdentifier: 'foobar'
    })
    expect(process.exit).toBeCalledWith(0)
    expect(startTunnel).toBeCalledTimes(1)
    expect(tunnelMock.close).toBeCalledTimes(1)
    expect(ora().warn.mock.calls[0][0])
        .toContain('Sauce Connect shutdown timedout')
})

test('should fail build if performance test fails', async () => {
    runPerformanceTest.mockImplementation(() => ({
        sessionId: 'foobar123',
        result: { result: 'failed' },
        benchmark: 1234,
        userAgent: 'chrome'
    }))
    await handler({ user: 'foo', key: 'bar', site: 'mypage', metric: ['load', 'speedIndex'] })
    expect(process.exit).toBeCalledWith(1)
})

test('should check jankiness', async () => {
    runPerformanceTest.mockImplementation(() => ({
        sessionId: 'foobar123',
        result: { result: 'pass' },
        benchmark: 1234,
        userAgent: 'chrome',
        jankinessResult: JANKINESS_RESULT
    }))
    await handler({
        user: 'foo',
        key: 'bar',
        site: 'mypage',
        jankiness: 50
    })
    
    expect(printJankinessResult.mock.calls[0][0]).toMatchSnapshot()
    expect(printResult.mock.calls[0][0]).toMatchSnapshot()
    expect(process.exit).toBeCalledWith(0)
})

test('should fail if jankiness score is out of budget', async () => {
    runPerformanceTest.mockImplementation(() => ({
        sessionId: 'foobar123',
        result: { result: 'pass' },
        benchmark: 1234,
        userAgent: 'chrome',
        jankinessResult: JANKINESS_RESULT
    }))
    await handler({
        user: 'foo',
        key: 'bar',
        site: 'mypage',
        jankiness: [90, 100]
    })
    
    expect(printJankinessResult.mock.calls[0][0]).toMatchSnapshot()
    expect(printResult.mock.calls[0][0]).toMatchSnapshot()
    expect(process.exit).toBeCalledWith(1)
})

afterEach(() => {
    process.exit.mockRestore()
    ora.mockClear()
    startTunnel.mockClear()
    ora().fail.mockClear()
    ora().start.mockClear()
    ora().stopAndPersist.mockClear()
    ora().warn.mockClear()
    resetSauceLabsFixtures()
    printResult.mockClear()
    prepareBudgetData.mockClear()
    getBudgetMetrics.mockClear()
    printJankinessResult.mockClear()
    getJankinessParam.mockClear()
})
