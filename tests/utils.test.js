import performanceResults from './__fixtures__/performance.json'
import {
    printResult, waitFor, getMetricParams, getThrottleNetworkParam,
    getJobUrl, analyzeReport, getJobName, getDeviceClassFromBenchmark
} from '../src/utils'
import { PERFORMANCE_METRICS } from '../src/constants'

const performanceLog = {
    timeToFirstByte: 123,
    firstContentfulPaint: 200,
    firstMeaningfulPaint: 222,
    load: 321,
    IdontexistMetric: 42,
    speedIndex: 10,
    pageWeight: 1000,
    score: 0.879935214
}

test('printResult when test passes', () => {
    const log = jest.fn()
    const result = { result: 'pass', details: {} }
    printResult(result, { metrics: performanceLog } , ['speedIndex', 'load', 'timeToFirstByte', 'score'], log)
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
        .toEqual('Good 3G')
    expect(getThrottleNetworkParam({ throttleNetwork: 'Regular 3G' }))
        .toEqual('Regular 3G')
    expect(() => getThrottleNetworkParam({ throttleNetwork: 'invalidNetworkCondition' }))
        .toThrow()
})

test('getJobUrl', () => {
    expect(getJobUrl({}, 'foobar'))
        .toEqual('https://app.saucelabs.com/performance/foobar/0')
    expect(getJobUrl({ region: 'eu' }, 'foobar'))
        .toEqual('https://app.eu-central-1.saucelabs.com/performance/foobar/0')
    expect(getJobUrl({ region: 'what?' }, 'foobar'))
        .toEqual('https://app.saucelabs.com/performance/foobar/0')
})

test('analyzeReport', () => {
    const log = jest.fn()
    analyzeReport(performanceResults , ['speedIndex', 'load', 'pageWeight'], log)
    expect(log.mock.calls).toMatchSnapshot()
})

test('getJobName', () => {
    expect(getJobName({ throttleCpu: 123 })).toBe('Performance test for undefined (on "Good 3G" and 123x CPU throttling)')
    expect(getJobName({ name: 'foobar' })).toBe('foobar')
})

test('getDeviceClassFromBenchmark', () => {
    expect(getDeviceClassFromBenchmark(1000)).toBe('desktop-class device')
    expect(getDeviceClassFromBenchmark(500)).toBe('high-end mobile phone')
    expect(getDeviceClassFromBenchmark(150)).toBe('mid-tier mobile phone')
    expect(getDeviceClassFromBenchmark(15)).toBe('budget mobile phone')
})
