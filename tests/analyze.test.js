import ora from 'ora'
import yargs from 'yargs'
import { fixtures, resetSauceLabsFixtures } from 'saucelabs'

import { handler } from '../src/commands/analyze'
import runPerformanceTest from '../src/runner'
import { waitFor, getMetricParams, getJobUrl, analyzeReport, getConfig, prepareBudgetData } from '../src/utils'
import { PERFORMANCE_METRICS_FAILING, PERFORMANCE_METRICS_MULTIPLE } from './__fixtures__/performance'

jest.mock('../src/runner')
jest.mock('../src/utils')
jest.mock('fs')

jest.useFakeTimers()

beforeEach(() => {
    jest.spyOn(process, 'exit').mockImplementation(() => {})
    delete process.env.SAUCE_USERNAME
    delete process.env.SAUCE_ACCESS_KEY
    getConfig.mockImplementation((argv) => argv)
    getMetricParams.mockImplementation(() => ['speedIndex', 'score'])
    getJobUrl.mockImplementation(() => 'https://saucelabs.com/performance/foobar/0')
    waitFor.mockImplementation((condition) => condition())
    runPerformanceTest.mockImplementation(() => ({ sessionId: 'foobar123', result: { result: 'pass' } }))
    prepareBudgetData.mockImplementation(({ load }) => ( load === 1000 ? {
        load: [{ l: 0, u: 1000 }],
        speedIndex: [{ l: 500, u: 1000 }]
    } : {
        load: [{ l: 0, u: 2000 }],
        speedIndex: [{ l: 1000, u: 1500 }]
    }))
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

test('should fail if no job was found', async () => {
    waitFor.mockReturnValue(Promise.reject(new Error('Couldn\'t find job in database')))
    await handler({ user: 'foo', key: 'bar', jobName: 'foobar' })
    expect(process.exit).toBeCalledTimes(1)
    expect(ora().fail.mock.calls[0][0])
        .toContain('Couldn\'t fetch job with name "foobar": Error: Couldn\'t find job in database')
})

test('should fail if job had an error', async () => {
    waitFor.mockReturnValue(Promise.resolve({ jobs: [{ error: true }] }))
    await handler({ user: 'foo', key: 'bar', jobName: 'barfoo' })
    expect(process.exit).toBeCalledTimes(1)
    expect(ora().fail.mock.calls[0][0])
        .toContain('Couldn\'t fetch job with name "barfoo": Error: job failed or did\'t complete')
})

test('should fail if it can not fetch performance metrics', async () => {
    fixtures.getPerformanceMetrics = Promise.reject(new Error('buhhu'))
    await handler({ user: 'foo', key: 'bar' })
    expect(process.exit).toBeCalledTimes(1)
    expect(ora().fail.mock.calls[0][0]).toContain('Couldn\'t fetch performance results: Error: buhhu')
})

test('should run without errors', async () => {
    await handler({ user: 'foo', key: 'bar', build: 'random build 1' })
    expect(process.exit).toBeCalledWith(0)
    expect(ora().start.mock.calls).toMatchSnapshot()
    expect(ora().stopAndPersist.mock.calls).toMatchSnapshot()
    expect(analyzeReport.mock.calls).toMatchSnapshot()
})

test('should fail command if performance results do not pass', async () => {
    fixtures.getPerformanceMetrics = PERFORMANCE_METRICS_FAILING
    await handler({
        user: 'foo',
        key: 'bar',
        build: 'random build 1'
    })
    expect(process.exit).toBeCalledWith(1)
})

test('should fail if asserting second order index', async () => {
    fixtures.getPerformanceMetrics = Object.assign({}, PERFORMANCE_METRICS_MULTIPLE)
    await handler({
        user: 'foo',
        key: 'bar',
        build: 'random build 1',
        orderIndex: 1
    })
    expect(process.exit).toBeCalledWith(1)
    expect(analyzeReport.mock.calls).toMatchSnapshot()
})

test('should pass if asserting first page url', async () => {
    fixtures.getPerformanceMetrics = Object.assign({}, PERFORMANCE_METRICS_MULTIPLE)
    await handler({
        user: 'foo',
        key: 'bar',
        build: 'random build 1',
        pageUrl: 'http://saucelabs-fast.com/'
    })
    expect(process.exit).toBeCalledWith(0)
    expect(analyzeReport.mock.calls).toMatchSnapshot()
    expect(ora().warn).toBeCalledTimes(0)
})

test('should fail if captured values are out of budget', async () => {
    fixtures.getPerformanceMetrics = Object.assign({}, PERFORMANCE_METRICS_MULTIPLE)
    await handler({
        user: 'foo',
        key: 'bar',
        build: 'random build 1',
        pageUrl: 'http://saucelabs-fast.com/',
        budget: {
            load: 1000,
            speedIndex: [500, 1000]
        }
    })
    expect(analyzeReport.mock.calls[0][0]).toMatchSnapshot()
    expect(process.exit).toBeCalledWith(1)
})

test('should pass if captured values are within budget', async () => {
    fixtures.getPerformanceMetrics = Object.assign({}, PERFORMANCE_METRICS_MULTIPLE)
    await handler({
        user: 'foo',
        key: 'bar',
        build: 'random build 1',
        pageUrl: 'http://saucelabs-fast.com/',
        budget: {
            load: 2000,
            speedIndex: [1000, 1500]
        }
    })
    expect(analyzeReport.mock.calls[0][0]).toMatchSnapshot()
    expect(process.exit).toBeCalledWith(0)    
})

afterEach(() => {
    process.exit.mockRestore()
    ora.mockClear()
    ora().fail.mockClear()
    ora().warn.mockClear()
    ora().start.mockClear()
    ora().stopAndPersist.mockClear()
    resetSauceLabsFixtures()
    setTimeout.mockClear()
    getConfig.mockClear()
    prepareBudgetData.mockClear()
    analyzeReport.mockClear()
})
