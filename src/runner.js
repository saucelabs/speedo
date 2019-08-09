import { remote } from 'webdriverio'

import { getMetricParams, getThrottleNetworkParam } from './utils'
import ultradumbBenchmarkScript from './scripts/benchmark'
import userAgentScript from './scripts/userAgent'

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
export default async function runPerformanceTest(username, accessKey, argv, name, build, logDir, retryCnt = 0, crmuxdriverVersion = 'stable') {
    const { site, platformName, browserVersion, tunnelIdentifier, parentTunnel } = argv
    const metrics = getMetricParams(argv)
    const networkCondition = getThrottleNetworkParam(argv)
    const sauceOptions = {
        'sauce:options': {
            name,
            build,
            crmuxdriverVersion,
            extendedDebugging: true,
            capturePerformance: true,
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

    /**
     * throttle network
     */
    if (networkCondition !== 'online') {
        await browser.throttleNetwork(networkCondition)
    }

    /**
     * throttle CPU
     */
    if (argv.throttleCpu !== 0) {
        await browser.execute('sauce:debug', {
            method: 'Emulation.setCPUThrottlingRate',
            params: { rate: argv.throttleCpu }
        })
    }

    /**
     * open page
     *
     * if user is running with a Sauce Connect tunnel and tries to open
     * a localhost page we have to modify it to be 0.0.0.0 otherwise the
     * page won't be accessible
     */
    await browser.url(tunnelIdentifier
        ? site.replace('localhost', '0.0.0.0')
        : site
    )

    try {
        /**
         * run `assertPerformance` command within try/catch as command
         * can fail if performance command couldn't be captured for
         * any reasons, e.g. NO_NAVSTART
         */
        const result = await browser.assertPerformance(name, metrics)
        const benchmark = await browser.execute(ultradumbBenchmarkScript)
        const userAgent = await browser.execute(userAgentScript)

        await browser.deleteSession()
        return { sessionId, result, benchmark, userAgent }
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
