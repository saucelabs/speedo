import { remote } from 'webdriverio'

import { getMetricParams, getThrottleNetworkParam, getThrottleCpuParam } from './utils'

export default async function runPerformanceTest (username, accessKey, argv, name, build, logDir) {
    const { site, platformName, browserVersion, tunnelIdentifier, parentTunnel } = argv
    const metrics = getMetricParams(argv)
    const networkCondition = getThrottleNetworkParam(argv)
    const cpuRate = getThrottleCpuParam(argv)
    const sauceOptions = {
        'sauce:options': {
            name,
            build,
            extendedDebugging: true,
            capturePerformance: true,
            crmuxdriverVersion: argv.beta ? 'beta' : 'stable',
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
        params: { rate: cpuRate }
    })
    await browser.url(site)

    try {
        const result = await browser.assertPerformance(name, metrics)
        await browser.deleteSession()
        return { sessionId, result }
    } catch (e) {
        await browser.deleteSession()

        // log data couldn't be fetched due to a tracing issue
        // run test again:
        return runPerformanceTest(username, accessKey, argv, name, build, logDir)
    }
}
