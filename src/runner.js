import { remote } from 'webdriverio'

import { getMetricParams, getThrottleNetworkParam } from './utils'

const MAX_RETRIES = 3

/**
 * script that runs performance test on Sauce Labs
 *
 * @param  {String} username   name of user account
 * @param  {String} accessKey  access key of user account
 * @param  {Object} argv       command line arguments
 * @param  {String} name       name of the test
 * @param  {String} build      name of the build
 * @param  {String} logDir     path to directory to store logs
 * @return {Object}            containing result and detail information of performance test
 */
export default async function runPerformanceTest (username, accessKey, argv, name, build, logDir, retryCnt = 0) {
    const { site, platformName, browserVersion, tunnelIdentifier, parentTunnel } = argv
    const metrics = getMetricParams(argv)
    const networkCondition = getThrottleNetworkParam(argv)
    const sauceOptions = {
        'sauce:options': {
            name,
            build,
            extendedDebugging: true,
            capturePerformance: true,
            crmuxdriverVersion: 'beta',
            seleniumVersion: '3.141.59',
            ...(tunnelIdentifier ? { tunnelIdentifier } : {}),
            ...(parentTunnel ? { parentTunnel } : {})
        }
    }

    const chromeOptions = {
        'goog:chromeOptions': { w3c: true }
    }

    const browser = await remote({
        user: username,
        key: accessKey,
        region: argv.region,
        logLevel: 'trace',
        outputDir: logDir,
        capabilities: {
            browserName: 'chrome',
            platformName,
            browserVersion,
            ...sauceOptions,
            ...chromeOptions
        }
    })

    const sessionId = browser.sessionId

    await browser.throttleNetwork(networkCondition)
    await browser.execute('sauce:debug', {
        method: 'Emulation.setCPUThrottlingRate',
        params: { rate: argv.throttleCpu }
    })
    await browser.url(site)

    try {
        /**
         * run `assertPerformance` command within try/catch as command
         * can fail if performance command couldn't be captured for
         * any reasons, e.g. NO_NAVSTART
         */
        const result = await browser.assertPerformance(name, metrics)
        await browser.deleteSession()
        return { sessionId, result }
    } catch (e) {
        await browser.deleteSession()

        /**
         * stop retrying after reaching MAX_RETRIES
         */
        if (retryCnt === MAX_RETRIES) {
            throw e
        }

        /**
         * log data couldn't be fetched due to a tracing issue
         * run test again:
         */
        return runPerformanceTest(username, accessKey, argv, name, build, logDir, ++retryCnt)
    }
}
