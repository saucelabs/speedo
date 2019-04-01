import ora from 'ora'
import yargs from 'yargs'
import SauceLabs from 'saucelabs'

import { getMetricParams, getJobUrl, analyzeReport, waitFor } from '../utils'
import {
    ERROR_MISSING_CREDENTIALS, ANALYZE_CLI_PARAMS, PERFORMANCE_METRICS
} from '../constants'

export const command = 'analyze [params...] <jobName>'
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

    const user = new SauceLabs(username, accessKey)
    const status = ora(`Fetch job "${argv.jobName}" from ${username}`).start()

    /**
     * fetch job
     */
    let job
    try {
        job = (await user.listJobs(
            username,
            { name: argv.jobName, limit: 1 }
        )).jobs.pop()

        /**
         * fail if no job can be found
         */
        if (!job) {
            throw new Error('job not found')
        }

        /**
         * error out if job didn't complete
         */
        if (job.error) {
            throw new Error('job failed or did\'t complete')
        }

        status.succeed()
    } catch (e) {
        status.fail(`Couldn't fetch job with name "${argv.jobName}": ${e.stack}`)
        return process.exit(1)
    }

    job.name = argv.jobName

    status.start('Analyze performance of job')
    const jobResult = {
        id: job.id,
        name: job.name,
        url: getJobUrl(argv, job.id),
        results: []
    }

    try {
        const performanceMetrics = await waitFor(
            () => user.getPerformanceMetrics(job.id),
            /* istanbul ignore next */
            (performanceMetrics) => performanceMetrics.items.length !== 0
        )

        /**
         * filter by page url if given
         */
        if (argv.pageUrl) {
            performanceMetrics.items = performanceMetrics.items.filter(
                (perfMetric) => perfMetric.page_url === argv.pageUrl)
        }

        /**
         * filter by order index if given
         */
        if (typeof argv.orderIndex === 'number') {
            performanceMetrics.items = performanceMetrics.items.filter(
                (perfMetric) => perfMetric.order_index === argv.orderIndex)
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

        jobResult.passed = Object.values(jobResult.results).find((r) => !r.passed)
        status.succeed()
    } catch (e) {
        status.fail(`Couldn't fetch performance results: ${e.stack}`)
        return process.exit(1)
    }

    analyzeReport(jobResult, metrics)
    process.exit(jobResult.passed ? 1 : 0)
}
