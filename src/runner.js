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
    const sessionId = browser.sessionId

    await browser.url(url)
    const result = await browser.assertPerformance(jobName, ['speedIndex'])
    await browser.deleteSession()
    return { sessionId, result }
}
