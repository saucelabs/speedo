import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { table } from 'table'
import { promisify } from 'util'
import prettyMs from 'pretty-ms'
import launchTunnel from 'sauce-connect-launcher'

import {
    JOB_COMPLETED_TIMEOUT, JOB_COMPLETED_INTERVAL, PERFORMANCE_METRICS,
    NETWORK_CONDITIONS, DEFAULT_CONFIG_NAME
} from './constants'

/**
 * disable colors in tests
 */
const ctx = new chalk.constructor({enabled: process.env.NODE_ENV !== 'test'})

const SAUCE_CONNECT_LOG_FILENAME = 'speedo-sauce-connect.log'

const sanitizeMetric = function (metric, value) {
    if (metric === 'score') {
        return Math.round(value * 100) + '/100'
    }

    return prettyMs(value)
}

/**
 * print results of cli run
 * @param  {Object}   result            result of performance assertion
 * @param  {Object}   performanceLog    performance data of performance run
 * @param  {String[]} metrics           asserted metrices
 * @param  {Function} [log=console.log] log method (for testing purposes)
 */
export const printResult = function (result, performanceLog, metrics, argv, /* istanbul ignore next */ log = console.log) { // eslint-disable-line no-console
    log('\nPerformance Results\n===================')

    /**
     * filter out non performance metrics and sort displayed metrics based on
     * - asserted metrics first
     * - order of occurence (TTFB < load)
     */
    const resultsSorted = Object.entries(performanceLog.metrics)
        .filter(([metricName]) => PERFORMANCE_METRICS.includes(metricName))
        .sort((a, b) => {
            if (metrics.includes(a[0]) && !metrics.includes(b[0])) {
                return -1
            } else if (!metrics.includes(a[0]) && metrics.includes(b[0])) {
                return 1
            }

            return PERFORMANCE_METRICS.indexOf(a[0]) - PERFORMANCE_METRICS.indexOf(b[0])
        })

    for (const [metric, value] of resultsSorted) {
        const output = `${metric}: ${sanitizeMetric(metric, value || 0)}`
        log(metrics.includes(metric) ? output : ctx.gray(output))
    }

    const resultDetails = []
    for (const [metric, { actual, lowerLimit, upperLimit }] of Object.entries(result.details)) {
        resultDetails.push(`Expected ${metric} to be between ${sanitizeMetric(metric, lowerLimit)} and ${sanitizeMetric(metric, upperLimit)} but was actually ${sanitizeMetric(metric, actual)}`)
    }

    if (result.result === 'pass') {
        return log(`\nResult: ${result.result} ✅\n`)
    }

    return log(`\nPerformance assertions failed! ❌\n${resultDetails.join('\n')}\n`)
}

/**
 * wait for a specific condition to happen and return result
 */
export const waitFor = function (
    query,
    condition,
    errorMessage = 'job couldn\'t shutdown',
    interval = JOB_COMPLETED_INTERVAL,
    timeout = JOB_COMPLETED_TIMEOUT
) {
    if (typeof query !== 'function' || typeof condition !== 'function') {
        throw Error('Expect query and condition to by typeof function')
    }

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(
            () => reject(new Error(errorMessage)),
            timeout)

        const intervalId = setInterval(async () => {
            const result = await query()
            if (!condition(result)) {
                return
            }

            clearTimeout(timeoutId)
            clearInterval(intervalId)
            return resolve(result)
        }, interval)
    })
}

/**
 * get list of metrics from job cli params and validate them
 * @param  {Object}   argv cli params
 * @return {String[]}      list of provided metrics if valid otherwise throws an error
 */
export const getMetricParams = function (argv) {
    const metrics = argv.all
        ? PERFORMANCE_METRICS
        : (argv.metric && !Array.isArray(argv.metric) ? [argv.metric] : argv.metric) || []

    /**
     * validate provided metrics
     */
    const invalidMetrics = metrics.filter((m) => !PERFORMANCE_METRICS.includes(m))
    if (invalidMetrics.length) {
        throw new Error(
            `You've provided invalid metrics: ${invalidMetrics.join(', ')}; ` +
            `only the following metrics are available: ${PERFORMANCE_METRICS.join(', ')}`)
    }

    return metrics
}

/**
 * validate throttleNetwork param
 * @param  {Object}   argv cli params
 */
export const getThrottleNetworkParam = function (argv) {
    /**
     * check if custom capabilities were set
     */
    const throttleParams = (argv.throttleNetwork || '').match(/^(\d+),(\d+),(\d+)$/)
    if (throttleParams) {
        const [download, upload, latency] = throttleParams.slice(1, 4).map((val) => parseInt(val, 10))
        return { download, upload, latency }
    }

    const networkCondition = argv.throttleNetwork || 'Good 3G'
    if (!NETWORK_CONDITIONS.includes(networkCondition)) {
        throw new Error(
            `You've provided an invalid network state for throttling: ${networkCondition}; ` +
            `only the following network states are available: ${NETWORK_CONDITIONS}`)
    }
    return networkCondition
}

/**
 * get device class for benchmark result
 */
export const getDeviceClassFromBenchmark = function (benchmark) {
    if (benchmark > 750) {
        return 'desktop-class device'
    } else if (benchmark > 300) {
        return 'high-end mobile phone'
    } else if (benchmark > 75) {
        return 'mid-tier mobile phone'
    }

    return 'budget mobile phone'
}

/**
 * get job name
 * @param  {Object}   argv cli params
 */
export const getJobName = function (argv) {
    if (typeof argv.name === 'string') {
        return argv.name
    }

    const networkParam = getThrottleNetworkParam(argv)
    const networkCondition = typeof networkParam === 'string'
        ? `"${networkParam}"`
        : 'a custom network profile'
    return `Performance test for ${argv.site} (on ${networkCondition} and ${argv.throttleCpu}x CPU throttling)`
}

/**
 * get url to job details page of given test
 * @param  {Object} argv      cli params
 * @param  {String} sessionId of test
 * @return {String}           url to given test
 */
export const getJobUrl = function (argv, sessionId) {
    const hostname = (!argv.region || !argv.region.includes('eu') ? '' : 'eu-central-1.') + 'saucelabs.com'
    return `https://app.${hostname}/performance/${sessionId}/0`
}

/**
 * get url of Lighthouse Report
 * @param  {Object} argv      cli params
 * @param  {String} sessionId of test
 * @param  {String} loaderId  id of page load
 * @return {String}           url of lhr
 */
export const getLigthouseReportUrl = function (argv, sessionId, loaderId) {
    const hostname = (!argv.region || !argv.region.includes('eu') ? 'us-west-1.' : 'eu-central-1.') + 'saucelabs.com'
    return `https://eds.${hostname}/${sessionId}/performance/${loaderId}/lhr.html`
}

/**
 * print results of cli analyze command
 * @param  {Object}   jobResult         performance data
 * @param  {String[]} metrics           asserted metrices
 * @param  {Function} [log=console.log] log method (for testing purposes)
 */
export const analyzeReport = function (jobResult, metrics, /* istanbul ignore next */ log = console.log) { // eslint-disable-line no-console
    log('\nPerformance Results\n===================')
    log(`\n${jobResult.passed ? '✅ SUCCESS:' : '❌ FAILURE:'} ${jobResult.name}:`)

    const data = []
    data.push(['#', 'Url', 'Metrics'])

    for (const pageResult of jobResult.results.sort((a, b) => a.orderIndex > b.orderIndex)) {
        const orderIndex = pageResult.orderIndex
        const url = pageResult.url
        const metricsOutput = Object.values(pageResult.metrics)
            .sort((a, b) => {
                if (metrics.includes(a.metric) && !metrics.includes(b.metric)) {
                    return -1
                } else if (!metrics.includes(a.metric) && metrics.includes(b.metric)) {
                    return 1
                }

                return PERFORMANCE_METRICS.indexOf(a.metric) - PERFORMANCE_METRICS.indexOf(b.metric)
            })
            .map(({ metric, value, baseline, passed }) => {
                return metrics.includes(metric)
                    ? `${passed
                        ? `✅ ${ctx.bold(metric)}: ${sanitizeMetric(metric, value)}`
                        : `❌ ${ctx.bold(metric)}: ${sanitizeMetric(metric, value)} ${baseline.u < value
                            ? ctx.red(`(${sanitizeMetric(metric, value - baseline.u)} over baseline)`)
                            : ctx.red(`(${sanitizeMetric(metric, baseline.l - value)} under baseline)`)
                        }`
                    }`
                    : ctx.gray(`${metric}: ${sanitizeMetric(metric, value)}`)
            })
            .join('\n')

        data.push([orderIndex, url, metricsOutput])
    }

    log(table(data), `👀 Check out job at ${jobResult.url}\n`)
}

/**
 * identifies whether a SC tunnel is already running and starts one if not
 *
 * @param  {Object} user             instance of API client
 * @param  {String} accessKey        access key of user
 * @param  {String} logDir           log directory
 * @param  {String} tunnelIdentifier tunnel identifier to use
 * @return {Promise|null}            null if tunnel is already running or the
 *                                   child process object of the started tunnel
 */
export const startTunnel = async function (user, accessKey, logDir, tunnelIdentifier) {
    const username = user.username
    const tunnelIds = await user.listTunnels(user.username)
    const tunnels = await Promise.all(tunnelIds.map((id) => user.getTunnel(user.username, id)))

    const runningTunnel = tunnels.find(
        (tunnel) => tunnelIdentifier === tunnel.tunnel_identifier)

    /**
     * exit if we find tunnel
     */
    if (runningTunnel) {
        return
    }

    /**
     * start Sauce Connect tunnel
     */
    return promisify(launchTunnel)({
        username,
        accessKey,
        proxy: process.env.HTTPS_PROXY || process.env.HTTP_PROXY,
        logfile: path.join(logDir, SAUCE_CONNECT_LOG_FILENAME),
        tunnelIdentifier
    })
}

/**
 * load config or read from parameters
 * @param  {Object} argv                   parameter object
 * @param  {Function} [requireFn=require]  require method (only for testing purposes)
 * @return {Object}                        config object
 */
export const getConfig = (argv, requireFn = require) => {
    const configFilePath = path.resolve(process.cwd(), argv.config || DEFAULT_CONFIG_NAME)

    if (!fs.existsSync(configFilePath)) {
        return argv
    }

    try {
        const config = requireFn(configFilePath)
        return Object.assign({}, argv, config)
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Couldn't load config: ${e.message}`)
        return argv
    }
}

/**
 * prepare budget data to compare with captured metrics values
 * @param  {Object}   argv cli params
 */
export const prepareBudgetData = (performanceBudget) => (
    Object.entries(performanceBudget).reduce((acc, [metric, budget]) => ({
        ...acc,
        [metric]: [{
            l: Array.isArray(budget) && budget.length > 1 ? budget[0] : 0,
            u: Array.isArray(budget) ? (budget.length > 1 ? budget[1] : budget[0]) : budget
        }]
    }), {})
)
