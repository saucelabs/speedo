import tmp from 'tmp'
import ora from 'ora'
import path from 'path'
import yargs from 'yargs'
import ordinal from 'ordinal'
import SauceLabs from 'saucelabs'

import runPerformanceTest from '../runner'
import { printResult, waitFor, getMetricParams, getJobUrl } from '../utils'
import { ERROR_MISSING_CREDENTIALS, REQUIRED_TESTS_FOR_BASELINE_COUNT, RUN_CLI_PARAMS } from '../constants'

export const command = 'run [params...] <site>'
export const desc = 'Run performance tests on any website.'
export const builder = RUN_CLI_PARAMS

export const handler = async (argv) => {
    const username = process.env.SAUCE_USERNAME || argv.user
    const accessKey = process.env.SAUCE_ACCESS_KEY || argv.key
    const jobName = argv.name || `Performance test for ${argv.site}`
    const buildName = argv.build || `${jobName} - ${(new Date()).toString()}`
    const metrics = getMetricParams(argv)

    /**
     * check if username and access key are available
     */
    if (!username || !accessKey) {
        yargs.showHelp()
        // eslint-disable-next-line no-console
        console.error(ERROR_MISSING_CREDENTIALS)
        return process.exit(1)
    }

    const status = ora(`Start performance test run with user ${username} on page ${argv.site}...`).start()

    const logDir = argv.logDir
        ? path.resolve(process.cwd(), argv.logDir)
        : tmp.dirSync().name

    /**
     * check if job already exists
     */
    const user = new SauceLabs({
        user: username,
        key: accessKey,
        region: argv.region
    })

    /**
     * find if job already exists
     */
    let job = null
    try {
        job = await user.listJobs(
            username,
            { name: jobName, limit: 10 }
        )
        status.succeed()
    } catch (e) {
        status.fail(`Couldn't fetch job: ${e.stack}`)
        return process.exit(1)
    }

    /**
     * create baseline if not enough tests have been executed
     */
    if (job.jobs.length < REQUIRED_TESTS_FOR_BASELINE_COUNT) {
        status.start(`Couldn't find baseline for job with name ${jobName}, creating baseline...`)

        const testCnt = REQUIRED_TESTS_FOR_BASELINE_COUNT - job.jobs.length
        await Promise.all([...Array(testCnt)].map(
            () => runPerformanceTest(username, accessKey, argv, jobName, undefined, logDir)))
        status.succeed()
    }

    /**
     * run single test
     */
    status.start('Run performance test...')
    let { result, sessionId } = await runPerformanceTest(
        username, accessKey, argv, jobName, buildName, logDir)

    /**
     * retry performance test
     */
    const retriedJobs = []
    if (result.result !== 'pass' && argv.retry) {
        for (let retry = 1; retry <= argv.retry; ++retry) {
            retriedJobs.push(sessionId)
            status.text = `Run performance test (${ordinal(retry)} retry)...`

            const retriedResult = await runPerformanceTest(
                username, accessKey, argv, jobName, buildName, logDir)

            result = retriedResult.result
            sessionId = retriedResult.sessionId

            /**
             * continue command if job has finally passed
             */
            if (result.result === 'pass') {
                break
            }
        }
    }

    status.succeed()

    /**
     * wait until job completes
     */
    try {
        status.start('Wait for job to finish...')
        await waitFor(
            () => user.getJob(username, sessionId),
            (jobDetails) => jobDetails.status === 'complete'
        )
        status.succeed()
    } catch (e) {
        status.fail(e.message)
        return process.exit(1)
    }

    /**
     * download performance logs
     */
    let performanceLog
    try {
        status.start('Download performance logs...')
        performanceLog = await user.downloadJobAsset(
            sessionId,
            'performance.json',
            path.join(logDir, 'performance.json'))
        status.succeed()
    } catch (e) {
        status.fail(`Couldn't download performance results due to: ${e.stack}`)
        return process.exit(1)
    }

    /**
     * download trace file if requested
     */
    if (argv.traceLogs) {
        status.start('Download trace logs...')

        const loaderId = performanceLog[0].loaderId
        await user.downloadJobAsset(
            sessionId,
            `_tracelog_${loaderId}.json.gz`,
            path.join(logDir, 'trace.json'))
    }

    /**
     * update job if performance check fails
     */
    try {
        status.start('Updating job status...')
        await user.updateJob(username, sessionId, { passed: result.result === 'pass' })
        status.succeed()
    } catch (e) {
        status.fail(`Couldn't update job due to: ${e.stack}`)
        status.stopAndPersist({ text: 'continuing ...' })
    }

    status.stopAndPersist({
        text: `Stored performance logs in ${logDir}`,
        symbol: '📃'
    })

    printResult(result, performanceLog[0], metrics)

    status.stopAndPersist({
        text: `Check out job at ${getJobUrl(argv, sessionId)}`,
        symbol: '👀'
    })

    /**
     * displayed retried jobs that failed
     */
    if (retriedJobs.length) {
        console.log( // eslint-disable-line no-console
            '\nFailed Performance Tests that were rerun:\n' +
            retriedJobs.map(id => getJobUrl(argv, id)).join('\n')
        )
    }

    process.exit(result.result === 'pass' ? 0 : 1)
}
