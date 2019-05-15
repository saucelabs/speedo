import ora from 'ora'
import yargs from 'yargs'
import { fixtures, lastInstance, resetSauceLabsFixtures } from 'saucelabs'

import { handler } from '../src/commands/run'
import runPerformanceTest from '../src/runner'
import { waitFor, getMetricParams, getJobUrl } from '../src/utils'

jest.mock('../src/runner')
jest.mock('../src/utils')
jest.mock('fs')

beforeEach(() => {
    jest.spyOn(process, 'exit').mockImplementation(() => {})
    delete process.env.SAUCE_USERNAME
    delete process.env.SAUCE_ACCESS_KEY

    getMetricParams.mockImplementation(() => ['speedIndex', 'pageWeight'])
    getJobUrl.mockImplementation(() => 'https://saucelabs.com/performance/foobar/0')
    waitFor.mockImplementation((condition) => condition())
    runPerformanceTest.mockImplementation(() => ({ sessionId: 'foobar123', result: { result: 'pass' } }))
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
    fixtures.listJobs = { jobs: [] }
    await handler({ user: 'foo', key: 'bar', site: 'mypage', metric: ['load', 'speedIndex'] })
    expect(process.exit).toBeCalledWith(0)
    expect(ora().start)
        .toBeCalledWith('Couldn\'t find baseline for job with name Performance test for mypage, creating baseline...')
})

test('should rerun performance tests if they fail', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    let failures = 0
    runPerformanceTest.mockImplementation(() => {
        if (failures === 3) {
            return { sessionId: 'foobarRetried123', result: { result: 'pass' } }
        }
        ++failures
        return { sessionId: 'foobar123', result: { result: 'failed' } }
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

test('should fail build if performance test fails', async () => {
    runPerformanceTest.mockImplementation(() => ({
        sessionId: 'foobar123',
        result: { result: 'failed' }
    }))
    await handler({ user: 'foo', key: 'bar', site: 'mypage', metric: ['load', 'speedIndex'] })
    expect(process.exit).toBeCalledWith(1)
})

afterEach(() => {
    process.exit.mockRestore()
    ora.mockClear()
    ora().fail.mockClear()
    ora().start.mockClear()
    ora().stopAndPersist.mockClear()
    resetSauceLabsFixtures()
})
