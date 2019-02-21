/**
 * print results of cli run
 */
export const printResult = function (result, performanceLog) {
    // eslint-disable-next-line no-console
    console.log('Performance Results\n===================')
    for (const [metric, value] of Object.entries(performanceLog.value.metrics)) {
        // eslint-disable-next-line no-console
        console.log(`${metric}: ${value}`)
    }

    const resultDetails = []
    for (const [metric, { actual, lowerLimit, upperLimit }] of Object.entries(result.details)) {
        resultDetails.push(`Expected ${metric} to be between ${lowerLimit} and ${upperLimit} but was actually ${actual}`)
    }

    if (result.result === 'pass') {
        // eslint-disable-next-line no-console
        return console.log(`\nResult: ${result.result}`)
    }

    // eslint-disable-next-line no-console
    return console.log(`\nPerformance assertions failed!\n${resultDetails.join('\n')}`)
}
