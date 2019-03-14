import { printResult, waitFor, getMetricParams, getJobUrl } from '../src/utils'

const performanceLog = {
    timeToFirstByte: 123,
    firstContentfulPaint: 200,
    firstMeaningfulPaint: 222,
    load: 321,
    IdontexistMetric: 42,
    speedIndex: 10,
    pageWeight: 1000
}

test('printResult when test passes', () => {
    const log = jest.fn()
    const result = { result: 'pass', details: {} }
    printResult(result, { metrics: performanceLog } , ['speedIndex', 'load', 'timeToFirstByte'], log)
    expect(log).toBeCalledWith('\nPerformance Results\n===================')
    expect(log).toBeCalledWith('timeToFirstByte: 123')
    expect(log).toBeCalledWith('load: 321')
    expect(log).toBeCalledWith('speedIndex: 10')
    expect(log).toBeCalledWith('\u001b[90mfirstMeaningfulPaint: 222\u001b[39m')
    expect(log).toBeCalledWith('\u001b[90mpageWeight: 1000\u001b[39m')
    expect(log).toBeCalledWith('\nResult: pass ✅\n')
})

test('printResult', () => {
    const log = jest.fn()
    const result = {
        result: 'failed',
        details: { speedIndex: { actual: 10, lowerLimit: 3, upperLimit: 7 } }
    }

    printResult(result, { metrics: performanceLog } , ['speedIndex', 'load'], log)
    expect(log).toBeCalledWith('\nPerformance Results\n===================')
    expect(log).toBeCalledWith('load: 321')
    expect(log).toBeCalledWith('speedIndex: 10')
    expect(log).toBeCalledWith('\u001b[90mtimeToFirstByte: 123\u001b[39m')
    expect(log).toBeCalledWith('\u001b[90mpageWeight: 1000\u001b[39m')
    expect(log).toBeCalledWith('\nPerformance assertions failed! ❌\nExpected speedIndex to be between 3 and 7 but was actually 10\n')
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

    await expect(waitFor(query, condition, 10, 50))
        .rejects.toEqual(new Error('job couldn\'t shutdown'))
})

test('getMetricParams', () => {
    expect(getMetricParams({}))
        .toEqual([])
    expect(getMetricParams({ metric: 'load' }))
        .toEqual(['load'])
    expect(getMetricParams({ metric: ['load', 'speedIndex'] }))
        .toEqual(['load', 'speedIndex'])
    expect(() => getMetricParams({ metric: ['load', 'speedIndex', 'foobar'] }))
        .toThrow()
})

test('getJobUrl', () => {
    expect(getJobUrl({}, 'foobar'))
        .toEqual('https://app.saucelabs.com/tests/foobar')
    expect(getJobUrl({ region: 'eu' }, 'foobar'))
        .toEqual('https://app.eu-central-1.saucelabs.com/tests/foobar')
    expect(getJobUrl({ region: 'what?' }, 'foobar'))
        .toEqual('https://app.saucelabs.com/tests/foobar')
})
