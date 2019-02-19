import yargs from 'yargs'

import { USAGE, CLI_PARAMS, EPILOG } from './constants'

export const run = () => {
    let argv = yargs.usage(USAGE)
        .commandDir('commands')
        .epilog(EPILOG)
        .demandCommand()
        .help()

    /**
     * populate cli arguments
     */
    for (const param of CLI_PARAMS) {
        argv = argv.option(param.name, param)
    }

    return argv.argv
}
