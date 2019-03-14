import yargs from 'yargs'

import { handler } from '../src/commands/run'

const processExit = ::process.exit

beforeEach(() => {
    process.exit = jest.fn()
    delete process.env.SAUCE_USERNAME
    delete process.env.SAUCE_ACCESS_KEY
})

test('run should fail if no auth is provided', async () => {
    await handler({})
    expect(process.exit).toBeCalledWith(1)
    expect(yargs.showHelp).toBeCalledTimes(1)
})

test('run', async () => {
    await handler({ user: 'foo', key: 'bar', metric: ['load', 'speedIndex'] })
})

afterEach(() => {
    process.exit = processExit
})
