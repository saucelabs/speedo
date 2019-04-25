import ora from 'ora'
import yargs from 'yargs'
import { fixtures, resetSauceLabsFixtures } from 'saucelabs'

import { handler } from '../src/commands/analyze'
import runPerformanceTest from '../src/runner'
import { waitFor, getMetricParams, getJobUrl, analyzeReport } from '../src/utils'
import { PERFORMANCE_METRICS_FAILING, PERFORMANCE_METRICS_MULTIPLE } from './__fixtures__/performance'

jest.mock('../src/runner')
jest.mock('../src/utils')
jest.mock('fs')

jest.useFakeTimers()

beforeEach(() => {
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    delete process.env.SAUCE_USERNAME
    delete process.env.SAUCE_ACCESS_KEY

    getMetricParams.mockImplementation(() => ['speedIndex', 'pageWeight'])
    getJobUrl.mockImplementation(() => 'https://saucelabs.com/performance/foobar/0')
    waitFor.mockImplementation((condition) => condition())
    runPerformanceTest.mockImplementation(() => ({ sessionId: 'foobar123', result: { result: 'pass' } }))
})

test('run should fail if no auth is provided', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await handler({})
    expect(console.error).toBeCalledTimes(1)
    expect(process.exit).toBeCalledWith(1)
    expect(yargs.showHelp).toBeCalledTimes(1)
    console.error.mockRestore()
})

test('should fail if no job was found', async () => {
    fixtures.listJobs = Promise.resolve({ jobs: [] })
    await handler({ user: 'foo', key: 'bar', jobName: 'foobar' })
    expect(process.exit).toBeCalledTimes(1)
    expect(ora().fail.mock.calls[0][0])
        .toContain('Couldn\'t fetch job with name "foobar": Error: job not found')
})

test('should fail if job had an error', async () => {
    fixtures.listJobs = Promise.resolve({ jobs: [{ error: true }] })
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

afterEach(() => {
    process.exit.mockRestore()
    ora.mockClear()
    ora().fail.mockClear()
    ora().warn.mockClear()
    ora().start.mockClear()
    ora().stopAndPersist.mockClear()
    resetSauceLabsFixtures()
    setTimeout.mockClear()
})
