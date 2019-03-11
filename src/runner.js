import { remote } from 'webdriverio'

export default async function runPerformanceTest (username, accessKey, argv, name, build, logDir) {
    const { site, platform, version } = argv
    const browser = await remote({
        user: username,
        key: accessKey,
        logLevel: 'trace',
        outputDir: logDir,
        capabilities: {
            browserName: 'chrome',
            platform,
            name,
            build,
            version,
            extendedDebugging: true
        }
    })
    const sessionId = browser.sessionId

    await browser.url(site)
    const result = await browser.assertPerformance(name, ['speedIndex'])
    await browser.deleteSession()
    return { sessionId, result }
}
