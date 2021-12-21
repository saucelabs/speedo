import path from 'path'
import SauceLabs from 'saucelabs'
import launchTunnel from 'sauce-connect-launcher'

import performanceResults from './__fixtures__/performance.json'
import {
    printResult, waitFor, getMetricParams, getThrottleNetworkParam,
    getJobUrl, analyzeReport, getJobName, getDeviceClassFromBenchmark,
    startTunnel, getConfig, getLigthouseReportUrl, prepareBudgetData,
    getBudgetMetrics, printJankinessResult, validateJankinessValue,
    getJankinessParam, sanitizeMetric
} from '../src/utils'
import { PERFORMANCE_METRICS } from '../src/constants'

const performanceLog = {
    firstContentfulPaint: 200,
    firstMeaningfulPaint: 222,
    load: 321,
    IdontexistMetric: 42,
    speedIndex: 10,
    pageWeight: 1000,
    score: 0.879935214,
    largestContentfulPaint: 1240,
    totalBlockingTime: 239,
    cumulativeLayoutShift: 0
}

test('printResult when test passes', () => {
    const log = jest.fn()
    const result = { result: 'pass', details: {} }
    printResult(result, { metrics: performanceLog } , ['speedIndex', 'load', 'score'], log)
    expect(log.mock.calls).toMatchSnapshot()
})

test('printResult', () => {
    const log = jest.fn()
    const result = {
        result: 'failed',
        details: { speedIndex: { actual: 10, lowerLimit: 3, upperLimit: 7 } }
    }

    printResult(result, { metrics: performanceLog } , ['speedIndex', 'load'], log)
    expect(log.mock.calls).toMatchSnapshot()
})

test('printJankinessResult', () => {
    const log = jest.fn()
    const result = {
        score: 0.9841666011958136,
        value: {
            metrics: { averageFPS: 60, idleTime: 5000 }
        }
    }

    printJankinessResult(result, log)
    expect(log.mock.calls).toMatchSnapshot()
})

test('waitFor should throw if parameters are not functions', () => {
    expect(() => waitFor()).toThrow()
    expect(() => waitFor(jest.fn())).toThrow()
    expect(() => waitFor(null, jest.fn())).toThrow()
})

test('waitFor waits until condition is true', async () => {
    let i = false
    const query = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return i
    }
    const condition = (_i) => {
        if (!_i) {
            i = true
            return _i
        }

        return _i
    }

    const start = Date.now()
    expect(await waitFor(query, condition, 10, 50)).toBe(true)
    expect(Date.now() - start).toBeGreaterThan(29)
})

test('waitFor times out if condition is never met', async () => {
    let i = false
    const query = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return i
    }
    const condition = (_i) => {
        if (!_i) {
            i = true
            return _i
        }

        return _i
    }

    const customError = new Error('Error: uups')
    await expect(waitFor(query, condition, 'Error: uups', 10, 50))
        .rejects.toEqual(customError)
})

test('getMetricParams', () => {
    expect(getMetricParams({}))
        .toEqual([])
    expect(getMetricParams({ all: true }))
        .toEqual(PERFORMANCE_METRICS)
    expect(getMetricParams({ metric: 'load' }))
        .toEqual(['load'])
    expect(getMetricParams({ metric: ['load', 'speedIndex'] }))
        .toEqual(['load', 'speedIndex'])
    expect(() => getMetricParams({ metric: ['load', 'speedIndex', 'foobar'] }))
        .toThrow()
})

test('getThrottleNetworkParam', () => {
    expect(getThrottleNetworkParam({}))
        .toBe('Good 3G')
    expect(getThrottleNetworkParam({ throttleNetwork: 'Regular 3G' }))
        .toBe('Regular 3G')
    expect(() => getThrottleNetworkParam({ throttleNetwork: 'invalidNetworkCondition' }))
        .toThrow()
    expect(getThrottleNetworkParam({ throttleNetwork: '123,456,789' }))
        .toEqual({ download: 123, upload: 456, latency: 789 })
})

test('getJobUrl', () => {
    expect(getJobUrl({}, 'foobar'))
        .toEqual('https://app.saucelabs.com/performance/foobar/0')
    expect(getJobUrl({ region: 'eu' }, 'foobar'))
        .toEqual('https://app.eu-central-1.saucelabs.com/performance/foobar/0')
    expect(getJobUrl({ region: 'what?' }, 'foobar'))
        .toEqual('https://app.saucelabs.com/performance/foobar/0')
})

test('getLigthouseReportUrl', () => {
    expect(getLigthouseReportUrl({}, 'foobar', 'barfoo'))
        .toEqual('https://api.us-west-1.saucelabs.com/v1/eds/foobar/performance/barfoo/lhr.html')
    expect(getLigthouseReportUrl({ region: 'eu' }, 'foobar', 'barfoo'))
        .toEqual('https://api.eu-central-1.saucelabs.com/v1/eds/foobar/performance/barfoo/lhr.html')
    expect(getLigthouseReportUrl({ region: 'what?' }, 'foobar', 'barfoo'))
        .toEqual('https://api.us-west-1.saucelabs.com/v1/eds/foobar/performance/barfoo/lhr.html')
})

test('analyzeReport', () => {
    const log = jest.fn()
    analyzeReport(performanceResults , ['speedIndex', 'load', 'timeToFirstInteractive'], log)
    expect(log.mock.calls).toMatchSnapshot()
})

test('getJobName', () => {
    expect(getJobName({ throttleCpu: 123 }))
        .toBe('Performance test for undefined (on "Good 3G" and 123x CPU throttling)')
    expect(getJobName({ throttleCpu: 123, throttleNetwork: '111,222,333' }))
        .toBe('Performance test for undefined (on a custom network profile and 123x CPU throttling)')
    expect(getJobName({ name: 'foobar' })).toBe('foobar')
})

test('getDeviceClassFromBenchmark', () => {
    expect(getDeviceClassFromBenchmark(1000)).toBe('desktop-class device')
    expect(getDeviceClassFromBenchmark(500)).toBe('high-end mobile phone')
    expect(getDeviceClassFromBenchmark(150)).toBe('mid-tier mobile phone')
    expect(getDeviceClassFromBenchmark(15)).toBe('budget mobile phone')
})

test('startTunnel should not need to start tunnel if tunnel exists', async () => {
    const user = new SauceLabs()
    await startTunnel(user, 'accessKey', '/foo/bar', 'foobar')
    expect(user.listTunnels).toBeCalledTimes(1)
    expect(user.getTunnel).toBeCalledTimes(2) // listTunnels returns 2 mocks
    expect(launchTunnel).toBeCalledTimes(0)
})

test('start tunnel actually starts tunnel of not existing', async () => {
    const user = new SauceLabs({ username: 'my-user' })
    await startTunnel(user, 'accessKey', '/foo/bar', 'does-not-exist')
    expect(user.listTunnels).toBeCalledTimes(1)
    expect(user.getTunnel).toBeCalledTimes(2) // listTunnels returns 2 mocks
    expect(launchTunnel).toBeCalledWith({
        accessKey: 'accessKey',
        logfile: '/foo/bar/speedo-sauce-connect.log',
        proxy: undefined,
        tunnelIdentifier: 'does-not-exist',
        username: 'my-user'
    }, expect.any(Function))
})

test('getConfig', () => {
    const argv = {
        build: 'barfoo',
        name: 'foobar'
    }
    expect(getConfig(argv)).toEqual(argv)

    const borkedConfigPath = path.resolve(__dirname, '__fixtures__', 'borked.config.js')
    const log = ::console.error // eslint-disable-line no-console
    console.error = jest.fn() // eslint-disable-line no-console
    expect(getConfig({ config: borkedConfigPath }))
        .toEqual({ config: borkedConfigPath })
    expect(console.error).toBeCalledTimes(1) // eslint-disable-line no-console
    console.error = log // eslint-disable-line no-console

    const correctConfig = path.resolve(__dirname, '__fixtures__', 'speedo.config.js')
    expect(getConfig({ config: correctConfig })).toEqual({
        config: correctConfig,
        name: 'from config file',
        retry: 2
    })
})

test('prepareBudgetData', () => {
    const performanceBudget = {
        domContentLoaded: [200, 300],
        firstVisualChange: 100,
        firstPaint: 300,
        firstContentfulPaint: 300,
        firstMeaningfulPaint: 300,
        lastVisualChange: 400,
        firstInteractive: 400,
        load: [50, 500],
        speedIndex: [100, 500],
        largestContentfulPaint: [100, 500],
        totalBlockingTime: 500,
        cumulativeLayoutShift: 400
    }

    expect(prepareBudgetData(performanceBudget)).toMatchSnapshot()
})

test('getBudgetMetrics', () => {
    const performanceBudget = {
        domContentLoaded: [200, 300],
        firstVisualChange: 100,
        firstPaint: 300,
        firstContentfulPaint: 300,
        firstMeaningfulPaint: 300,
        lastVisualChange: 400,
        firstInteractive: 400,
        load: [50, 500],
        speedIndex: [100, 500],
        largestContentfulPaint: [100, 500],
        totalBlockingTime: 500,
        cumulativeLayoutShift: 400
    }

    expect(getBudgetMetrics(performanceBudget)).toMatchSnapshot()
    try {
        getBudgetMetrics({ foo: 20 })
        expect(true).toBe(false)
    } catch (error) {
        expect(error.message).toMatchSnapshot()
    }
})

test('sanitizeMetric', () => {
    expect(sanitizeMetric('load', 5000)).toMatchSnapshot()
    expect(sanitizeMetric('score', 0.50)).toMatchSnapshot()
    expect(sanitizeMetric('jankiness', 80)).toMatchSnapshot()
    expect(sanitizeMetric('memoryUsageDiff', 10027708)).toMatchSnapshot()
    expect(sanitizeMetric('averageFPS', 60)).toBe(60)
})

test('validateJankinessValue', () => {
    expect(validateJankinessValue('50')).toMatchSnapshot()
    expect(validateJankinessValue([50, 100])).toMatchSnapshot()
    expect(validateJankinessValue('[50, 100]')).toMatchSnapshot()
    try {
        validateJankinessValue(120)
        expect(true).toBe(false)
    } catch (error) {
        expect(error.message).toMatchSnapshot()
    }
})

test('getJankinessParam', () => {
    expect(getJankinessParam({ jankiness: 50 })).toMatchSnapshot()
    expect(getJankinessParam({ }, { jankiness: 50 })).toMatchSnapshot()
    expect(getJankinessParam()).toBe(null)
})
