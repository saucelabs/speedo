import assert from 'assert'
import { remote } from 'webdriverio'

export default async function runPerformanceTest (username, accessKey, url, jobName, buildName, logDir) {
    const browser = await remote({
        user: username,
        key: accessKey,
        logLevel: 'trace',
        outputDir: logDir,
        capabilities: {
            browserName: 'chrome',
            platform: 'Windows 10',
            name: jobName,
            build: buildName,
            version: 'latest',
            extendedDebugging: true
        }
    })

    await browser.url(url)
    const { result, details } = await browser.assertPerformance(jobName, ['speedIndex'])

    const resultDetails = []
    for (const [metric, { actual, lowerLimit, upperLimit }] of Object.entries(details)) {
        if (actual > lowerLimit && actual < upperLimit) {
            continue
        }

        resultDetails.push(`Expected ${metric} to be between ${lowerLimit} and ${upperLimit} but was actually ${actual}`)
    }
    assert.equal(result, 'pass', `Performance assertions failed!\n${resultDetails.join('\n')}`)

    await browser.deleteSession()
    return browser.sessionId
}
