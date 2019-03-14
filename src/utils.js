import chalk from 'chalk'

import { JOB_COMPLETED_TIMEOUT, JOB_COMPLETED_INTERVAL, PERFORMANCE_METRICS } from './constants'

/**
 * print results of cli run
 * @param  {Object}   result            result of performance assertion
 * @param  {Object}   performanceLog    performance data of performance run
 * @param  {String[]} metrics           asserted metrices
 * @param  {Function} [log=console.log] log method (for testing purposes)
 */
export const printResult = function (result, performanceLog, metrics, log = console.log) { // eslint-disable-line no-console
    log('\nPerformance Results\n===================')

    /**
     * sort displayed metrics based on
     * - asserted metrics first
     * - order of occurence (TTFB < load)
     */
    const resultsSorted = Object.entries(performanceLog.value.metrics).sort((a, b) => {
        if (metrics.includes(a[0]) && !metrics.includes(b[0])) {
            return -1
        } else if (!metrics.includes(a[0]) && metrics.includes(b[0])) {
            return 1
        }

        return PERFORMANCE_METRICS.indexOf(a[0]) - PERFORMANCE_METRICS.indexOf(b[0])
    })

    for (const [metric, value] of resultsSorted) {
        const output = `${metric}: ${value}`
        log(metrics.includes(metric) ? output : chalk.gray(output))
    }

    const resultDetails = []
    for (const [metric, { actual, lowerLimit, upperLimit }] of Object.entries(result.details)) {
        resultDetails.push(`Expected ${metric} to be between ${lowerLimit} and ${upperLimit} but was actually ${actual}`)
    }

    if (result.result === 'pass') {
        return log(`\nResult: ${result.result} ${result.result === 'pass' ? '✅' : '❌'}\n`)
    }

    return log(`\nPerformance assertions failed!\n${resultDetails.join('\n')}\n`)
}

/**
 * wait for a specific condition to happen and return result
 */
export const waitFor = function (query, condition) {
    if (typeof query !== 'function' || typeof condition !== 'function') {
        throw Error('Expect query and condition to by typeof function')
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(
            () => reject(new Error('job couldn\'t shutdown')),
            JOB_COMPLETED_TIMEOUT)

        const interval = setInterval(async () => {
            const result = await query()
            if (!condition(result)) {
                return
            }

            clearTimeout(timeout)
            clearInterval(interval)
            return resolve(result)
        }, JOB_COMPLETED_INTERVAL)
    })
}

/**
 * get list of metrics from job cli params and validate them
 * @param  {Object}   argv cli params
 * @return {String[]}      list of provided metrics if valid otherwise throws an error
 */
export const getMetricParams = function (argv) {
    const metrics = !Array.isArray(argv.metric) ? [argv.metric] : argv.metric

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
 * get url to job details page of given test
 * @param  {Object} argv      cli params
 * @param  {String} sessionId of test
 * @return {String}           url to given test
 */
export const getJobUrl = function (argv, sessionId) {
    const hostname = (!argv.region || !argv.region.includes('eu') ? '' : 'eu-central-1.') + 'saucelabs.com'
    return `https://app.${hostname}/tests/${sessionId}`
}
