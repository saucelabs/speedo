import yargs from 'yargs'
// import SauceLabs from 'saucelabs'
// import { promisfy } from 'util'

import { ERROR_MISSING_CREDENTIALS } from '../constants'

export const command = 'run [params...] <site>'
export const desc = 'Run performance tests on website'

export const handler = async (argv) => {
    const username = process.env.SAUCE_USERNAME || argv.user
    const accessKey = process.env.SAUCE_ACCESS_KEY || argv.key
    // const jobName = argv.name || `Performance test for ${argv.site}`

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
    // const user = new SauceLabs({ username, password: accessKey })
}
