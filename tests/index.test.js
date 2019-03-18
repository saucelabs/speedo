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
