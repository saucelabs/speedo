export const USAGE = `
Speedo CLI runner`

export const EPILOG = 'Copyright 2019 © Sauce Labs'

export const COMMON_CLI_PARAMS = [{
    alias: 'h',
    name: 'help',
    description: 'prints speedo help menu'
}, {
    alias: 'u',
    name: 'user',
    description: 'your Sauce Labs username'
}, {
    alias: 'k',
    name: 'key',
    description: 'your Sauce Labs user key'
}, {
    alias: 'l',
    name: 'logDir',
    description: 'directory to store logs from testrun'
}, {
    alias: 't',
    name: 'traceLogs',
    description: 'if set runner downloads tracing logs for further investigations'
}]

export const RUN_CLI_PARAMS ={
    platformName: {
        alias: 'p',
        description: 'the platform the performance test should run in (e.g. "Windows 10")',
        default: 'Windows 10'
    },
    browserVersion: {
        alias: 'v',
        description: 'the browser version of Chrome the performance test should run in (e.g. "latest")',
        default: 'latest'
    },
    name: {
        alias: 'n',
        description: 'name of your performance test'
    }
}

export const ANALYZE_CLI_PARAMS = {
    name: {
        alias: 'n',
        description: 'name of a specific test within given build to analyze'
    }
}

export const ERROR_MISSING_CREDENTIALS = `
Your Sauce credentials are missing!
Either set 'SAUCE_USERNAME' and 'SAUCE_ACCESS_KEY' in your environment or
provide them as parameter`

export const REQUIRED_TESTS_FOR_BASELINE_COUNT = 10
export const JOB_COMPLETED_TIMEOUT = 20000
export const JOB_COMPLETED_INTERVAL = 1000
