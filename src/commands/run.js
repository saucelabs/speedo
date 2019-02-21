import tmp from 'tmp'
import path from 'path'
import yargs from 'yargs'
import SauceLabs from 'saucelabs'

import runPerformanceTest from '../runner'
import { printResult } from '../utils'
import { ERROR_MISSING_CREDENTIALS, REQUIRED_TESTS_FOR_BASELINE_COUNT, JOB_COMPLETED_TIMEOUT, JOB_COMPLETED_INTERVAL } from '../constants'

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

    // eslint-disable-next-line no-console
    console.log(`Start performance test run with user ${username} on page ${argv.site}...`)

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
        // eslint-disable-next-line no-console
        console.error(`Couldn't fetch job: ${e.stack}`)
    }

    /**
     * create baseline if not enough tests have been executed
     */
    if (job.jobs.length < REQUIRED_TESTS_FOR_BASELINE_COUNT) {
        // eslint-disable-next-line no-console
        console.log(`Couldn't find baseline for job with name ${jobName}, creating baseline...`)

        const testCnt = REQUIRED_TESTS_FOR_BASELINE_COUNT - job.jobs.length
        await Promise.all([...Array(testCnt)].map(
            () => runPerformanceTest(username, accessKey, argv.site, jobName, buildName, logDir)))
    }

    /**
     * run single test
     */
    // eslint-disable-next-line no-console
    console.log('Run performance test...')
    const { result, sessionId } = await runPerformanceTest(username, accessKey, argv.site, jobName, buildName, logDir)

    /**
     * wait until job completes
     */
    // eslint-disable-next-line no-console
    console.log('Wait for job to finish...')
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(
            () => reject(new Error('job couldn\'t shutdown')),
            JOB_COMPLETED_TIMEOUT)

        const interval = setInterval(async () => {
            const jobDetails = await user.getJob(username, sessionId)

            if (jobDetails.status !== 'complete') {
                return
            }

            clearTimeout(timeout)
            clearInterval(interval)
            return resolve(jobDetails)
        }, JOB_COMPLETED_INTERVAL)
    })

    /**
     * download performance logs
     */
    // eslint-disable-next-line no-console
    console.log('Download performance logs...')
    const performanceLog = JSON.parse(await user.downloadJobAsset(
        sessionId,
        'performance.json',
        path.join(logDir, 'performance.json')))

    /**
     * download trace file if requested
     */
    if (argv.traceLogs) {
        // eslint-disable-next-line no-console
        console.log('Download trace logs...')

        const loaderId = performanceLog[0].loaderId
        await user.downloadJobAsset(
            sessionId,
            `_tracelog_${loaderId}.json.gz`,
            path.join(logDir, 'trace.json'))
    }

    // eslint-disable-next-line no-console
    console.log(`Done!\nStored performance logs in ${logDir}\n`)
    printResult(result, performanceLog[0])

    // eslint-disable-next-line no-console
    console.log(`\nCheck out job at https://app.${user.host}/tests/${sessionId}`)

    process.exit(result.result === 'pass' ? 0 : 1)
}
