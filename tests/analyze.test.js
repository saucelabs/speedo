import ora from 'ora'
import yargs from 'yargs'
import { fixtures, resetSauceLabsFixtures } from 'saucelabs'

import { handler } from '../src/commands/analyze'
import runPerformanceTest from '../src/runner'
import { waitFor, getMetricParams, getJobUrl, analyzeReport } from '../src/utils'
import { PERFORMANCE_METRICS_FAILING, PERFORMANCE_METRICS_MULTIPLE } from './__fixtures__/performance'
import { BUILD_WITH_MANY_JOBS } from './__fixtures__/builds'

jest.mock('../src/runner')
jest.mock('../src/utils')
jest.mock('fs')

jest.useFakeTimers()

const processExit = ::process.exit

beforeEach(() => {
    process.exit = jest.fn()
    delete process.env.SAUCE_USERNAME
    delete process.env.SAUCE_ACCESS_KEY

    getMetricParams.mockImplementation(() => ['speedIndex', 'pageWeight'])
    getJobUrl.mockImplementation(() => 'https://saucelabs.com/tests/foobar')
    waitFor.mockImplementation((condition) => condition())
    runPerformanceTest.mockImplementation(() => ({ sessionId: 'foobar123', result: { result: 'pass' } }))
})

test('run should fail if no auth is provided', async () => {
    await handler({})
    expect(process.exit).toBeCalledWith(1)
    expect(yargs.showHelp).toBeCalledTimes(1)
})

test('fails when builds can not be fetched', async () => {
    fixtures.listBuilds = Promise.reject(new Error('buh'))
    await handler({ user: 'foo', key: 'bar', metric: ['load', 'speedIndex'] })
    expect(ora().fail).toBeCalledTimes(1)
    expect(ora().fail.mock.calls[0][0]).toContain('Couldn\'t fetch builds')
    expect(process.exit).toBeCalledTimes(1)
})

test('fails if build id can not be found', async () => {
    await handler({ user: 'foo', key: 'bar', build: 'I do not exist' })
    expect(process.exit).toBeCalledTimes(1)
    expect(ora().fail.mock.calls[0][0]).toContain('Couldn\'t find build with name "I do not exist"')
})

test('fails if it can not fetch build jobs', async () => {
    fixtures.listBuildJobs = Promise.reject(new Error('buh'))
    await handler({ user: 'foo', key: 'bar', build: 'random build 1' })
    expect(process.exit).toBeCalledTimes(1)
    expect(ora().fail.mock.calls[0][0]).toContain('Couldn\'t fetch job from build with name "random build 1"')
})

test('should fail if it can not fetch performance metrics', async () => {
    fixtures.getPerformanceMetrics = Promise.reject(new Error('buhhu'))
    await handler({ user: 'foo', key: 'bar', build: 'random build 1' })
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

test('should display warning if too many tests are tested', async () => {
    fixtures.listBuildJobs = BUILD_WITH_MANY_JOBS
    fixtures.getPerformanceMetrics = Object.assign({}, PERFORMANCE_METRICS_MULTIPLE)
    getMetricParams.mockImplementation(() => [...Array(11)].map((item, i) => `metric${i}`))
    await handler({
        user: 'foo',
        key: 'bar',
        build: 'random build 1',
        pageUrl: 'http://saucelabs-fast.com/'
    })
    expect(setTimeout).toBeCalledTimes(3)
    expect(ora().warn).toBeCalledTimes(1)
    expect(ora().warn.mock.calls).toMatchSnapshot()
})

afterEach(() => {
    process.exit = processExit
    ora.mockClear()
    ora().fail.mockClear()
    ora().warn.mockClear()
    ora().start.mockClear()
    ora().stopAndPersist.mockClear()
    resetSauceLabsFixtures()
    setTimeout.mockClear()
})
