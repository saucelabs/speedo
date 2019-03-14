import ora from 'ora'
import yargs from 'yargs'
import SauceLabs from 'saucelabs'

import { getMetricParams } from '../utils'
import { ERROR_MISSING_CREDENTIALS, ANALYZE_CLI_PARAMS } from '../constants'

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
            { limit: 5, subaccounts: false }
        )
    } catch (e) {
        status.fail(`Couldn't fetch builds: ${e.stack}`)
        return process.exit(1)
    }

    const build = builds.find((build) => build.name === argv.build)
    if (!build) {
        status.fail(`Couldn't find build with name "${argv.build}"`)
        return process.exit(1)
    }

    status.succeed()
    status.start(`Fetch jobs from build "${argv.build}"`)
    let buildJobs = null
    try {
        buildJobs = (await user.listBuildJobs(build.id, { full: true })).jobs
    } catch (e) {
        status.fail(`Couldn't fetch job from build with name "${argv.build}": ${e.stack}`)
        return process.exit(1)
    }

    const specificJobs = buildJobs.filter((job) => argv.name && job.name === argv.name)
    if (argv.name && specificJobs.length) {
        buildJobs = specificJobs
    }

    status.succeed()
    status.start(`Analyze performance of ${buildJobs.length} jobs`)
    let performanceResults = null
    try {
        for (const job of buildJobs) {
            const perfTests = await user.assertPerformanceRegression(job.id, {
                metricNames: metrics
            })
            console.log(perfTests)
        }
    } catch (e) {
        status.fail(`Couldn't fetch performance results: ${e.stack}`)
        return process.exit(1)
    }

    status.succeed()
    // console.log(JSON.stringify(results, null, 4))

}
