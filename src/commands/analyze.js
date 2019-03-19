import util from 'util'

import ora from 'ora'
import yargs from 'yargs'
import SauceLabs from 'saucelabs'

import { getMetricParams, getJobUrl, analyzeReport, waitFor } from '../utils'
import {
    ERROR_MISSING_CREDENTIALS, ANALYZE_CLI_PARAMS, PERFORMANCE_METRICS,
    ASSERTION_AMOUNT_WARNING_COUNT, ASSERTION_AMOUNT_WARNING_MESSAGE,
    MOOD_MAKER_MESSAGES, MOOD_MAKER_TIMEOUT
} from '../constants'

export const command = 'analyze [params...] <build>'
export const desc = 'Analyze results of prerun performance tests.'
export const builder = ANALYZE_CLI_PARAMS

export const handler = async (argv) => {
    const username = process.env.SAUCE_USERNAME || argv.user
    const accessKey = process.env.SAUCE_ACCESS_KEY || argv.key
    const metrics = getMetricParams(argv)

    /**
     * check if username and access key are available
     */
    if (!username || !accessKey) {
        yargs.showHelp()
        // eslint-disable-next-line no-console
        console.error(ERROR_MISSING_CREDENTIALS)
        return process.exit(1)
    }

    /**
     * check if job already exists
     */
    const user = new SauceLabs(username, accessKey)

    /**
     * find build
     */
    let builds = null
    const status = ora(`Fetch last builds from ${username}`).start()
    try {
        builds = await user.listBuilds(
            username,
            // fetch the last 5 builds and hope the desired one is in there
            { limit: 50, subaccounts: false }
        )
        status.succeed()
    } catch (e) {
        status.fail(`Couldn't fetch builds: ${e.stack}`)
        return process.exit(1)
    }

    const build = builds.find((build) => build.name === argv.build)
    if (!build) {
        status.fail(`Couldn't find build with name "${argv.build}"`)
        return process.exit(1)
    }

    status.start(`Fetch jobs from build "${argv.build}"`)
    let buildJobs = null
    try {
        buildJobs = (await user.listBuildJobs(build.id, { full: true })).jobs
        status.succeed()

        /**
         * filter out errored jobs
         */
        buildJobs = buildJobs.filter((job) => !job.error)

        /**
         * filter jobs based on name if provided
         */
        if (argv.name) {
            buildJobs = buildJobs.filter((job) => job.name === argv.name)
        }
    } catch (e) {
        status.fail(`Couldn't fetch job from build with name "${argv.build}": ${e.stack}`)
        return process.exit(1)
    }

    const specificJobs = buildJobs.filter((job) => argv.name && job.name === argv.name)
    if (argv.name && specificJobs.length) {
        buildJobs = specificJobs
    }

    const analyzeReportMessage = 'Analyze performance of %s jobs'
    let jobsToAnalyze = buildJobs.length
    status.start(util.format(analyzeReportMessage, jobsToAnalyze))

    let performanceResults = []
    let assertedPagesCount = 0
    let reportMoodMaker = ''
    try {
        const moodTimeout = setTimeout(
            /* istanbul ignore next */
            () => (reportMoodMaker = MOOD_MAKER_MESSAGES.shift()),
            MOOD_MAKER_TIMEOUT)
        const superMoodTimeout = setTimeout(
            /* istanbul ignore next */
            () => (reportMoodMaker = MOOD_MAKER_MESSAGES.shift()),
            MOOD_MAKER_TIMEOUT * 2)
        const extremMoodTimeout = setTimeout(
            /* istanbul ignore next */
            () => (reportMoodMaker = MOOD_MAKER_MESSAGES.shift()),
            MOOD_MAKER_TIMEOUT * 4)

        for (const job of buildJobs) {
            const jobResult = {
                id: job.id,
                name: job.name,
                url: getJobUrl(argv, job.id),
                results: []
            }

            const performanceMetrics = await waitFor(
                () => user.getPerformanceMetrics(job.id),
                /* istanbul ignore next */
                (performanceMetrics) => performanceMetrics.items.length !== 0
            )

            /**
             * filter by order index if given
             */
            if (typeof argv.orderIndex === 'number') {
                performanceMetrics.items = performanceMetrics.items.filter(
                    (perfMetric) => perfMetric.order_index === argv.orderIndex)
            }

            /**
             * filter by page url if given
             */
            if (argv.pageUrl) {
                performanceMetrics.items = performanceMetrics.items.filter(
                    (perfMetric) => perfMetric.page_url === argv.pageUrl)
            }

            for (const pageLoadMetric of performanceMetrics.items) {
                const results = {}
                const baselineHistory = await user.getBaselineHistory(job.id, {
                    metricNames: PERFORMANCE_METRICS,
                    orderIndex: pageLoadMetric.order_index
                })

                for (const [metricName, baseline] of Object.entries(baselineHistory)) {
                    const capturedValue = pageLoadMetric.metric_data[metricName]
                    const result = {
                        metric: metricName,
                        passed: true,
                        value: capturedValue || 0,
                        baseline: baseline[0]
                    }

                    if (metrics.includes(metricName) && (baseline[0].u < capturedValue || baseline[0].l > capturedValue)) {
                        result.passed = false
                    }

                    results[metricName] = result
                }

                jobResult.results.push({
                    orderIndex: pageLoadMetric.order_index,
                    url:  pageLoadMetric.page_url,
                    passed: !Object.values(results).find((r) => !r.passed),
                    metrics: results
                })
            }

            assertedPagesCount += jobResult.results.length
            jobResult.passed = !Object.values(jobResult.results).find((r) => !r.passed),
            performanceResults.push(jobResult)
            status.text = util.format(analyzeReportMessage + reportMoodMaker, --jobsToAnalyze)
        }

        status.succeed(util.format(analyzeReportMessage, buildJobs.length))

        /**
         * print warning, if the user asserts too many metrics for too many urls
         */
        if ((assertedPagesCount * metrics.length) > ASSERTION_AMOUNT_WARNING_COUNT) {
            status.warn(util.format(
                ASSERTION_AMOUNT_WARNING_MESSAGE,
                metrics.length,
                assertedPagesCount,
                buildJobs.length
            ))
        }

        clearTimeout(moodTimeout)
        clearTimeout(superMoodTimeout)
        clearTimeout(extremMoodTimeout)
    } catch (e) {
        status.fail(`Couldn't fetch performance results: ${e.stack}`)
        return process.exit(1)
    }

    analyzeReport(performanceResults, metrics)
    process.exit(performanceResults.find((result) => !result.passed) ? 1 : 0)
}
