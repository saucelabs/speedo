export const USAGE = `
Speedo CLI runner`

export const EPILOG = 'Copyright 2019 © Sauce Labs'

export const PERFORMANCE_METRICS = [
    'estimatedInputLatency',
    'timeToFirstByte',
    'domContentLoaded',
    'firstVisualChange',
    'firstPaint',
    'firstContentfulPaint',
    'firstMeaningfulPaint',
    'lastVisualChange',
    'firstCPUIdle',
    'firstInteractive',
    'load',
    'speedIndex',
    'score'
]

export const NETWORK_CONDITIONS = [
    'offline',
    'GPRS',
    'Regular 2G',
    'Good 2G',
    'Regular 3G',
    'Good 3G',
    'Regular 4G',
    'DSL',
    'Wifi',
    'online'
]

const METRIC_PARAM = {
    alias: 'm',
    name: 'metric',
    description: 'metric that you want to check (multiple possible)',
    default: 'score'
}

const ALL_PARAM = {
    name: 'all',
    description: 'check on all metrics',
    default: false,
    type: 'boolean'
}

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
    alias: 'r',
    name: 'region',
    description: 'your Sauce Labs datacenter region, the following regions are available: `us-west-1` (short `us`), `eu-central-1` (short `eu`)',
    default: 'us'
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
    build: {
        alias: 'b',
        description: 'name of the build you want to run your performance test in'
    },
    name: {
        alias: 'n',
        description: 'name of your performance test'
    },
    metric: METRIC_PARAM,
    all: ALL_PARAM,
    /**
     * the reason we set a throttling default is three-fold
     * 1) throttling must be active to get firstCPUIdle and firstInteractive metrics
     * 2) it more realistically simulates real world conditions
     * 3) Good 3G is also the lighthouse default
     */
    throttleNetwork: {
        description: 'throttle network speed for your test (e.g. "Good 3G")',
        default: 'Good 3G'
    },
    throttleCpu: {
        description: 'throttle cpu speed for your test (e.g. "4" for 1/4 speed)',
        default: 4,
        type: 'number'
    },
    retry: {
        description: 'amount of retries for failing performance tests',
        default: 0,
        type: 'number'
    },
    tunnelIdentifier: {
        alias: 'i',
        description: 'identifier for Sauce Connect tunnel to run performance tests for local hosted apps'
    },
    parentTunnel: {
        description: 'username of parent running Sauce Connect tunnel'
    }
}

export const ANALYZE_CLI_PARAMS = {
    orderIndex: {
        alias: 'o',
        description: 'number of page you have opened in that test (requires to specify a test name with -n)'
    },
    pageUrl: {
        alias: 'p',
        description: 'url of page in the test you want to analyze (requires to specify a test name with -n)'
    },
    metric: METRIC_PARAM,
    all: ALL_PARAM
}

export const ERROR_MISSING_CREDENTIALS = `
Your Sauce credentials are missing!
Either set 'SAUCE_USERNAME' and 'SAUCE_ACCESS_KEY' in your environment or
provide them as parameter`

export const REQUIRED_TESTS_FOR_BASELINE_COUNT = 10
export const JOB_COMPLETED_TIMEOUT = 20000
export const JOB_COMPLETED_INTERVAL = 1000
