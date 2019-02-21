import { JOB_COMPLETED_TIMEOUT, JOB_COMPLETED_INTERVAL } from './constants'

/**
 * print results of cli run
 */
/* eslint-disable no-console */
export const printResult = function (result, performanceLog) {
    console.log('\nPerformance Results\n===================')
    for (const [metric, value] of Object.entries(performanceLog.value.metrics)) {
        console.log(`${metric}: ${value}`)
    }

    const resultDetails = []
    for (const [metric, { actual, lowerLimit, upperLimit }] of Object.entries(result.details)) {
        resultDetails.push(`Expected ${metric} to be between ${lowerLimit} and ${upperLimit} but was actually ${actual}`)
    }

    if (result.result === 'pass') {
        return console.log(`\nResult: ${result.result} ${result.result === 'pass' ? '✅' : '❌'}\n`)
    }

    return console.log(`\nPerformance assertions failed!\n${resultDetails.join('\n')}\n`)
}
/* eslint-enable no-console */

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
