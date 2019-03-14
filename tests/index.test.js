import yargs from 'yargs'

import { run } from '../src'

test('run', () => {
    run()

    expect(yargs.usage).toBeCalledTimes(1)
    expect(yargs.commandDir).toBeCalledTimes(1)
    expect(yargs.epilog).toBeCalledTimes(1)
    expect(yargs.demandCommand).toBeCalledTimes(1)
    expect(yargs.help).toBeCalledTimes(1)

    expect(yargs.option).toBeCalledWith('user', {
        alias: 'u',
        name: 'user',
        description: 'your Sauce Labs username'
    })
})

// import yargs from 'yargs'
//
// import { USAGE, COMMON_CLI_PARAMS, EPILOG } from './constants'
//
// export const run = () => {
//     let argv = yargs.usage(USAGE)
//         .commandDir('commands')
//         .epilog(EPILOG)
//         .demandCommand()
//         .help()
//
//     /**
//      * populate cli arguments
//      */
//     for (const param of COMMON_CLI_PARAMS) {
//         argv = argv.option(param.name, param)
//     }
//
//     return argv.argv
// }
