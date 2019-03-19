import { remote } from 'webdriverio'

import { getMetricParams } from './utils'

export default async function runPerformanceTest (username, accessKey, argv, name, build, logDir) {
    const { site, platformName: platform, browserVersion: version } = argv
    const metrics = getMetricParams(argv)
    const sauceOptions = { name, build, extendedDebugging: true }

    if (argv.tunnelIdentifier) {
        sauceOptions.tunnelIdentifier = argv.tunnelIdentifier
    }

    const browser = await remote({
        user: username,
        key: accessKey,
        region: argv.region,
        logLevel: 'trace',
        outputDir: logDir,
        capabilities: {
            browserName: 'chrome',
            platform,
            version,
            ...sauceOptions
        }
    })

    const sessionId = browser.sessionId

    await browser.url(site)
    const result = await browser.assertPerformance(name, metrics)
    await browser.deleteSession()
    return { sessionId, result }
}
