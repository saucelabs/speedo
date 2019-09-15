import fs from 'fs'
import tmp from 'tmp'
import ora from 'ora'
import path from 'path'
import yargs from 'yargs'
import ordinal from 'ordinal'
import SauceLabs from 'saucelabs'
import changeCase from 'change-case'

import runPerformanceTest from '../runner'
import {
    printResult, waitFor, getMetricParams, getJobUrl,
    getJobName, getThrottleNetworkParam, getDeviceClassFromBenchmark,
    startTunnel, getConfig
} from '../utils'
import {
    ERROR_MISSING_CREDENTIALS, REQUIRED_TESTS_FOR_BASELINE_COUNT,
    RUN_CLI_PARAMS, TUNNEL_SHUTDOWN_TIMEOUT
} from '../constants'

export const command = 'run [params...] <site>'
export const desc = 'Run performance tests on any website.'
export const builder = RUN_CLI_PARAMS

export const handler = async (argv) => {
    const config = getConfig(argv)
    const username = config.user || process.env.SAUCE_USERNAME
    const accessKey = config.key || process.env.SAUCE_ACCESS_KEY
    const jobName = getJobName(config)
    const buildName = config.build || `${jobName} - ${(new Date()).toString()}`
    const metrics = getMetricParams(config)

    /**
     * check if username and access key are available
     */
    if (!username || !accessKey) {
        yargs.showHelp()
        // eslint-disable-next-line no-console
        console.error(ERROR_MISSING_CREDENTIALS)
        return process.exit(1)
    }

    const status = ora(`Start performance test run with user ${username} on page ${config.site}...`).start()

    const logDir = config.logDir
        ? path.resolve(process.cwd(), config.logDir)
        : tmp.dirSync().name

    /**
     * check if job already exists
     */
    const user = new SauceLabs({
        user: username,
        key: accessKey,
        region: config.region
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
     * start Sauce Connect if not done by user
     */
    let tunnelProcess
    if (config.tunnelIdentifier) {
        status.start(`Checking for Sauce Connect tunnel with identifier "${config.tunnelIdentifier}"`)
        try {
            tunnelProcess = await startTunnel(user, accessKey, logDir, config.tunnelIdentifier)

            if (tunnelProcess) {
                status.text = `Started Sauce Connect tunnel with identifier "${config.tunnelIdentifier}"`
            }

            status.succeed()
        } catch (err) {
            status.fail(`Problem setting up Sauce Connect: ${err.stack}`)
            return process.exit(1)
        }
    }

    /**
     * create baseline if not enough tests have been executed
     */
    if (job.jobs.length < REQUIRED_TESTS_FOR_BASELINE_COUNT) {
        status.start(`Couldn't find baseline for job with name "${jobName}", creating baseline...`)

        const testCnt = REQUIRED_TESTS_FOR_BASELINE_COUNT - job.jobs.length
        await Promise.all([...Array(testCnt)].map(
            () => runPerformanceTest(username, accessKey, config, jobName, undefined, logDir)))
        status.succeed()
    }

    /**
     * run single test
     */
    status.start('Run performance test...')
    let { result, sessionId, benchmark, userAgent } = await runPerformanceTest(
        username, accessKey, config, jobName, buildName, logDir)

    /**
     * retry performance test
     */
    const retriedJobs = []
    if (result.result !== 'pass' && config.retry) {
        for (let retry = 1; retry <= config.retry; ++retry) {
            retriedJobs.push(sessionId)
            status.text = `Run performance test (${ordinal(retry)} retry)...`

            const retriedResult = await runPerformanceTest(
                username, accessKey, config, jobName, buildName, logDir)

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
            /* istanbul ignore next */
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
        const perfMetrics = await waitFor(
            () => user.getPerformanceMetrics(sessionId),
            /* istanbul ignore next */
            (performanceMetrics) => performanceMetrics.items.length !== 0,
            'Couldn\'t receive any performance metrics'
        )
        performanceLog = perfMetrics.items.map((item) => ({
            sessionId: item.job_id,
            url: item.page_url,
            orderIndex: item.order_index,
            loaderId: item.loader_id,
            metrics: Object.entries(item.metric_data).reduce((obj, [metricName, metricValue]) => {
                obj[changeCase.camelCase(metricName)] = metricValue
                return obj
            }, {})
        }))

        /**
         * store data log dir
         */
        fs.writeFileSync(
            path.join(logDir, 'performance.json'),
            JSON.stringify(performanceLog, null, 4)
        )

        status.succeed()
    } catch (e) {
        status.fail(`Couldn't download performance results due to: ${e.stack}`)
        return process.exit(1)
    }

    /**
     * download trace file if requested
     */
    if (config.traceLogs) {
        status.start('Download trace logs...')

        const loaderId = performanceLog[0].loaderId
        try {
            await user.downloadJobAsset(
                sessionId,
                `_tracelog_${loaderId}.json.gz`,
                path.join(logDir, 'trace.json'))
            status.succeed()
        } catch (e) {
            status.fail(`Couldn't fetch trace logs: ${e.stack}`)
            status.stopAndPersist({ text: 'continuing ...' })
        }
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

    /**
     * stop tunnel if one was created in the beginning
     */
    if (tunnelProcess) {
        status.start('Stopping Sauce Connect tunnel...')
        await new Promise((resolve) => {
            const shutdownTimeout = setTimeout(() => {
                status.warn('Sauce Connect shutdown timedout, you may still have tunnels lingering around')
                return resolve()
            }, TUNNEL_SHUTDOWN_TIMEOUT)

            return tunnelProcess.close(() => {
                clearTimeout(shutdownTimeout)
                status.succeed()
                resolve()
            })
        })
    }

    status.stopAndPersist({
        text: `Stored performance logs in ${logDir}`,
        symbol: '📃'
    })

    printResult(result, performanceLog[0], metrics, config)

    const networkCondition = getThrottleNetworkParam(config)
    const runtimeSettings = [
        `- Network Throttling: ${networkCondition}`,
        `- CPU Throttling: ${config.throttleCpu}x`,
        `- CPU/Memory Power: ${benchmark} (${getDeviceClassFromBenchmark(benchmark)})`,
        `- User Agent: ${userAgent}`
    ]
    status.stopAndPersist({
        text: `Runtime settings:\n${runtimeSettings.join('\n')}\n`,
        symbol: '⚙️ '
    })

    status.stopAndPersist({
        text: `Check out job at ${getJobUrl(config, sessionId)}`,
        symbol: '👀'
    })

    /**
     * displayed retried jobs that failed
     */
    if (retriedJobs.length) {
        console.log( // eslint-disable-line no-console
            '\nFailed Performance Tests that were rerun:\n' +
            retriedJobs.map(id => getJobUrl(config, id)).join('\n')
        )
    }

    process.exit(result.result === 'pass' ? 0 : 1)
}
