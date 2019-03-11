import tmp from 'tmp'
import ora from 'ora'
import path from 'path'
import yargs from 'yargs'
import SauceLabs from 'saucelabs'

import runPerformanceTest from '../runner'
import { printResult, waitFor } from '../utils'
import { ERROR_MISSING_CREDENTIALS, REQUIRED_TESTS_FOR_BASELINE_COUNT } from '../constants'

export const command = 'run [params...] <site>'
export const desc = 'Run performance tests on website'

export const handler = async (argv) => {
    const username = process.env.SAUCE_USERNAME || argv.user
    const accessKey = process.env.SAUCE_ACCESS_KEY || argv.key
    const jobName = argv.name || `Performance test for ${argv.site}`
    const buildName = `${jobName} - ${(new Date()).toString()}`

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
    const user = new SauceLabs(username, accessKey)

    /**
     * find if job already exists
     */
    let job = null
    try {
        job = await user.listJobs(
            username,
            { name: jobName, limit: 10 }
        )
    } catch (e) {
        status.fail(`Couldn't fetch job: ${e.stack}`)
        return process.exit(1)
    }

    /**
     * create baseline if not enough tests have been executed
     */
    if (job.jobs.length < REQUIRED_TESTS_FOR_BASELINE_COUNT) {
        status.succeed()
        status.start(`Couldn't find baseline for job with name ${jobName}, creating baseline...`)

        const testCnt = REQUIRED_TESTS_FOR_BASELINE_COUNT - job.jobs.length
        await Promise.all([...Array(testCnt)].map(
            () => runPerformanceTest(username, accessKey, argv, jobName, buildName, logDir)))
    }

    /**
     * run single test
     */
    status.succeed()
    status.start('Run performance test...')
    const { result, sessionId } = await runPerformanceTest(
        username, accessKey, argv.site, argv, jobName, buildName, logDir)
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
    status.start('Download performance logs...')
    const performanceLog = JSON.parse(await user.downloadJobAsset(
        sessionId,
        'performance.json',
        path.join(logDir, 'performance.json')))

    /**
     * download trace file if requested
     */
    if (argv.traceLogs) {
        status.succeed()
        status.start('Download trace logs...')

        const loaderId = performanceLog[0].loaderId
        await user.downloadJobAsset(
            sessionId,
            `_tracelog_${loaderId}.json.gz`,
            path.join(logDir, 'trace.json'))
    }
    status.succeed()

    status.stopAndPersist({
        text: `Stored performance logs in ${logDir}`,
        symbol: '📃'
    })

    printResult(result, performanceLog[0])

    status.stopAndPersist({
        text: `Check out job at https://app.${user.host}/tests/${sessionId}`,
        symbol: '👀'
    })
    process.exit(result.result === 'pass' ? 0 : 1)
}
