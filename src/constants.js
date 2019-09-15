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
    config: {
        alias: 'c',
        description: 'path to Speedo config file to read parameters from',
        default: './speedo.config.js'
    },
    platformName: {
        alias: 'p',
        description: 'the platform the performance test should run in (e.g. "Windows 10")',
        default: 'Windows 10'
    },
    browserVersion: {
        alias: 'v',
        description: 'the browser version of Chrome the performance test should run in (e.g. "74")',
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
    device: {
        description: 'if set the provided mobile device is emulated, otherwise set "desktop"',
        default: 'Nexus 7',
        type: 'string',
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
    },
    crmuxdriverVersion: {
        default: 'stable',
        description: 'Sauce Labs internal driver version (don\'t modify this if you don\'t know what you are doing)',
        hidden: true
    }
}

export const ANALYZE_CLI_PARAMS = {
    orderIndex: {
        alias: 'o',
        description: 'number of page you have opened in that test'
    },
    pageUrl: {
        alias: 'p',
        description: 'url of page in the test you want to analyze'
    },
    metric: METRIC_PARAM,
    all: ALL_PARAM
}

export const ERROR_MISSING_CREDENTIALS = `
Your Sauce credentials are missing!
Either set 'SAUCE_USERNAME' and 'SAUCE_ACCESS_KEY' in your environment or
provide them as parameter`

export const DEFAULT_CONFIG_NAME = 'speedo.config.js'
export const REQUIRED_TESTS_FOR_BASELINE_COUNT = 10
export const JOB_COMPLETED_TIMEOUT = 20000
export const JOB_COMPLETED_INTERVAL = 1000
export const TUNNEL_SHUTDOWN_TIMEOUT = 5000

export const MOBILE_DEVICES = {
    'Blackberry PlayBook': {
        userAgent: 'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+',
        viewport: {
            width: 600,
            height: 1024,
            deviceScaleFactor: 1,
            mobile: true
        }
    },
    'BlackBerry Z30': {
        userAgent: 'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'Galaxy Note 3': {
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 3,
            mobile: true
        }
    },
    'Galaxy Note II': {
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'Galaxy S III': {
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'Galaxy S5': {
        userAgent: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 3,
            mobile: true
        }
    },
    'iPad': {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        viewport: {
            width: 768,
            height: 1024,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'iPad Mini': {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        viewport: {
            width: 768,
            height: 1024,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'iPad Pro': {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        viewport: {
            width: 1024,
            height: 1366,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'iPhone 4': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53',
        viewport: {
            width: 320,
            height: 480,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'iPhone 5': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        viewport: {
            width: 320,
            height: 568,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'iPhone 6': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'iPhone 6 Plus': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 414,
            height: 736,
            deviceScaleFactor: 3,
            mobile: true
        }
    },
    'iPhone 7': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'iPhone 7 Plus': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 414,
            height: 736,
            deviceScaleFactor: 3,
            mobile: true
        }
    },
    'iPhone 8': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'iPhone 8 Plus': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 414,
            height: 736,
            deviceScaleFactor: 3,
            mobile: true
        }
    },
    'iPhone SE': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        viewport: {
            width: 320,
            height: 568,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'iPhone X': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 375,
            height: 812,
            deviceScaleFactor: 3,
            mobile: true
        }
    },
    'iPhone XR': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
        viewport: {
            width: 414,
            height: 896,
            deviceScaleFactor: 3,
            mobile: true
        }
    },
    'JioPhone 2': {
        userAgent: 'Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5',
        viewport: {
            width: 240,
            height: 320,
            deviceScaleFactor: 1,
            mobile: true
        }
    },
    'Kindle Fire HDX': {
        userAgent: 'Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true',
        viewport: {
            width: 800,
            height: 1280,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'LG Optimus L70': {
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 384,
            height: 640,
            deviceScaleFactor: 1.25,
            mobile: true
        }
    },
    'Microsoft Lumia 550': {
        userAgent: 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 550) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263',
        viewport: {
            width: 640,
            height: 360,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'Microsoft Lumia 950': {
        userAgent: 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 4,
            mobile: true
        }
    },
    'Nexus 10': {
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36',
        viewport: {
            width: 800,
            height: 1280,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'Nexus 4': {
        userAgent: 'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 384,
            height: 640,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'Nexus 5': {
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 3,
            mobile: true
        }
    },
    'Nexus 5X': {
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 412,
            height: 732,
            deviceScaleFactor: 2.625,
            mobile: true
        }
    },
    'Nexus 6': {
        userAgent: 'Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 412,
            height: 732,
            deviceScaleFactor: 3.5,
            mobile: true
        }
    },
    'Nexus 6P': {
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 412,
            height: 732,
            deviceScaleFactor: 3.5,
            mobile: true
        }
    },
    'Nexus 7': {
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36',
        viewport: {
            width: 600,
            height: 960,
            deviceScaleFactor: 2,
            mobile: true
        }
    },
    'Nokia Lumia 520': {
        userAgent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)',
        viewport: {
            width: 320,
            height: 533,
            deviceScaleFactor: 1.5,
            mobile: true
        }
    },
    'Nokia N9': {
        userAgent: 'Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13',
        viewport: {
            width: 480,
            height: 854,
            deviceScaleFactor: 1,
            mobile: true
        }
    },
    'Pixel 2': {
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 411,
            height: 731,
            deviceScaleFactor: 2.625,
            mobile: true
        }
    },
    'Pixel 2 XL': {
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 411,
            height: 823,
            deviceScaleFactor: 3.5,
            mobile: true
        }
    }
}
