import chalk from 'chalk'
import { table } from 'table'
import prettyMs from 'pretty-ms'
import prettyBytes from 'pretty-bytes'

import { JOB_COMPLETED_TIMEOUT, JOB_COMPLETED_INTERVAL, PERFORMANCE_METRICS, NETWORK_CONDITIONS } from './constants'

/**
 * disable colors in tests
 */
const ctx = new chalk.constructor({enabled: process.env.NODE_ENV !== 'test'})

/**
 * print results of cli run
 * @param  {Object}   result            result of performance assertion
 * @param  {Object}   performanceLog    performance data of performance run
 * @param  {String[]} metrics           asserted metrices
 * @param  {Function} [log=console.log] log method (for testing purposes)
 */
export const printResult = function (result, performanceLog, metrics, /* istanbul ignore next */ log = console.log) { // eslint-disable-line no-console
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
        const output = `${metric}: ${formatMetric[metric](value || 0)}`
        log(metrics.includes(metric) ? output : ctx.gray(output))
    }

    const resultDetails = []
    for (const [metric, { actual, lowerLimit, upperLimit }] of Object.entries(result.details)) {
        resultDetails.push(`Expected ${metric} to be between ${formatMetric[metric](lowerLimit)} and ${formatMetric[metric](upperLimit)} but was actually ${formatMetric[metric](actual)}`)
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
 * validate throttle param
 * @param  {Object}   argv cli params
 */
export const getThrottleParam = function (argv) {
    const networkCondition = argv.throttle || 'Regular 3G'
    if (!NETWORK_CONDITIONS.includes(networkCondition)) {
        throw new Error(
            `You've provided an invalid network state for throttling: ${networkCondition}; ` +
            `only the following network states are available: ${NETWORK_CONDITIONS}`)
    }
    return networkCondition
}

/**
 * get url to job details page of given test
 * @param  {Object} argv      cli params
 * @param  {String} sessionId of test
 * @return {String}           url to given test
 */
export const getJobUrl = function (argv, sessionId) {
    const hostname = (!argv.region || !argv.region.includes('eu') ? '' : 'eu-central-1.') + 'saucelabs.com'
    return `https://app.${hostname}/tests/${sessionId}`
}

export const formatMetric = {
    timeToFirstByte: prettyMs,
    firstPaint: prettyMs,
    firstContentfulPaint: prettyMs,
    firstMeaningfulPaint: prettyMs,
    domContentLoaded: prettyMs,
    timeToFirstInteractive: prettyMs,
    load: prettyMs,
    speedIndex: prettyMs,
    perceptualSpeedIndex: prettyMs,
    pageWeight: prettyBytes,
    pageWeightEncoded: prettyBytes
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
            .map(({ metric, value, baseline, passed }) => metrics.includes(metric)
                ? `${ctx.bold(metric)}: ${formatMetric[metric](value)} ${passed
                    ? ''
                    : baseline.u < value
                        ? ctx.red(`(${formatMetric[metric](value - baseline.u)} over baseline)`)
                        : ctx.red(`(${formatMetric[metric](baseline.l - value)} under baseline)`)
                }`
                : ctx.gray(`${metric}: ${formatMetric[metric](value)}`)
            )
            .join('\n')

        data.push([orderIndex, url, metricsOutput])
    }

    log(table(data), `👀 Check out job at ${jobResult.url}\n`)
}
